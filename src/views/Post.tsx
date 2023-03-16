import {
  archivePost,
  blockUser,
  fetchPost,
  reportPost,
  unarchivePost,
  unblockUser,
  votePost,
  fetchComment
} from '@/api'
import { fetchWithProgress } from '@/views/helper'
import ThePostComments from '@/components/ThePostComments.vue'
import ThePostDetail from '@/components/ThePostDetail'
import ThePostHeader from '@/components/ThePostHeader.vue'
import ThePostNavigation from '@/components/ThePostNavigation.vue'
import TheLayout from '@/components/TheLayout.vue'
import TheSidebar from '@/components/TheSidebar.vue'
import { useTranslation } from 'react-i18next'

interface PostProps {
  postId: String | Number
}

export default {
  data () {
    return {
      post: {}
    }
  },
  computed: {
    /* eslint-disable camelcase */
    context () {
      const { from_view, from_page, search_query } = this.$route.query
      const query = {}
      if (from_page) {
        query.page = from_page
      }

      if (search_query) {
        query.query = search_query
      }

      if (from_view === 'topic') {
        query.topic = this.post.parent_topic?.slug
      }

      switch (from_view) {
        case 'user':
          return { name: 'user', params: { username: this.$route.query.created_by }, query }

        case 'recent':
          query.board = 'recent'
          return { name: 'my-info', query }

        case 'scrap':
          return { name: 'archive', query }

        case 'all':
          return { name: 'board', query }

        case '-portal':
          return { name: 'board', query: { ...query, portal: 'exclude' } }

        default:
          return {
            name: 'board',
            params: {
              boardSlug: this.post.parent_board ? this.post.parent_board.slug : null
            },
            query
          }
      }
    }
  },

  async beforeRouteEnter ({ params: { postId }, query }, from, next) {
    const [ post ] = await fetchWithProgress([
      fetchPost({ postId, context: query })
    ], 'post-failed-fetch')
    next(vm => {
      vm.post = post
      document.title = `Ara - ${post.is_hidden ? vm.$t('hidden-post') : post.title}`
    })
  },

  async beforeRouteUpdate ({ params: { postId }, query }, from, next) {
    const [ post ] = await fetchWithProgress([
      fetchPost({ postId, context: query })
    ], 'post-failed-fetch')
    document.title = `Ara - ${post.is_hidden ? this.$t('hidden-post') : post.title}`
    this.post = post
    next()
  },

  methods: {
    async addNewComment (comment) {
      comment.is_mine = true
      comment.created_by.profile.nickname = this.post.my_comment_profile.profile.nickname
      comment.created_by.profile.picture = this.post.my_comment_profile.profile.picture
      comment.created_by.id = this.post.my_comment_profile.id
      if (comment.parent_comment) {
        /* Save the new recomment in local first. */
        const rootComment = this.post.comments.find(parent => parent.id === comment.parent_comment)
        rootComment.comments = [
          ...rootComment.comments,
          comment
        ]
      } else {
        // Save the new comment in local first.
        this.post.comments = [
          ...this.post.comments,
          comment
        ]
      }
    },

    async updateComment (update) {
      if (update.parent_comment) {
        const rootComment = this.post.comments.find(comment => comment.id === update.parent_comment)
        const replyIndex = rootComment.comments.findIndex(replyComment => replyComment.id === update.id)
        if (replyIndex < 0) return

        update.created_by.profile = rootComment.comments[replyIndex].created_by.profile
        update.created_by.username = rootComment.comments[replyIndex].created_by.username
        update.created_by.id = rootComment.comments[replyIndex].created_by.id
        this.$set(rootComment.comments, replyIndex, update)
        return
      }

      const commentIndex = this.post.comments.findIndex(comment => comment.id === update.id)
      if (commentIndex < 0) return

      // Code for maintain anonymous / realname profile when user modifies his/her comment.
      update.created_by.profile = this.post.comments[commentIndex].created_by.profile
      update.created_by.username = this.post.comments[commentIndex].created_by.username
      update.created_by.id = this.post.comments[commentIndex].created_by.id
      // Apply
      this.$set(this.post.comments, commentIndex, update)
    },

    // @TODO: 매번 refresh 하는게 최선인지는 좀 생각해 봐야할듯
    async refresh () {
      this.post = await fetchPost({ postId: this.postId, context: this.$route.query })
    },

    async vote ({ id, vote }) {
      try {
        await votePost(id, vote)
      } catch (err) {
        this.$store.dispatch('dialog/toast', this.$t('nonvotable-myself'))
      }
      await this.refresh()
    },

    async archive () {
      if (this.post.my_scrap) {
        await unarchivePost(this.post.my_scrap.id)
        this.post.my_scrap = null
        this.$store.dispatch('dialog/toast', this.$t('unarchived'))
      } else {
        const result = await archivePost(this.post.id)
        this.post.my_scrap = result
        this.$store.dispatch('dialog/toast', this.$t('archived'))
      }
      await this.$store.dispatch('fetchArchivedPosts')
    },

    async report () {
      if (this.post.can_override_hidden === false) {
        this.$store.dispatch('dialog/toast', this.$t('report-unavailable'))
        return
      }
      const { result, selection } = await this.$store.dispatch('dialog/report', this.$t('confirm-report'))
      if (!result) return
      // What can be type_report? : violation_of_code, impersonation, insult, spam, others.
      // Where can I get typeReport?
      const typeReport = 'others'
      let reasonReport = ''
      for (const key in selection) {
        if (selection[key]) {
          reasonReport += key
          reasonReport += ', '
        }
      }
      reasonReport = reasonReport.slice(0, -2)
      try {
        await reportPost(this.post.id, typeReport, reasonReport)
        this.$store.dispatch('dialog/toast', this.$t('reported'))
      } catch (err) {
        this.$store.dispatch('dialog/toast', this.$t('already-reported'))
      }
    },

    async block () {
      try {
        if (!this.post.created_by.is_blocked) {
          const result = await this.$store.dispatch('dialog/confirm', this.$t('confirm-block'))
          if (!result) return
          await blockUser(this.post.created_by.id)
          this.post.created_by.is_blocked = true
          this.$store.dispatch('dialog/toast', this.$t('blocked'))
        } else {
          await unblockUser(this.post.created_by.id)
          this.post.created_by.is_blocked = false
          this.$store.dispatch('dialog/toast', this.$t('unblocked'))
        }
      } catch (e) {
        if (e.response.status === 403) {
          this.$store.dispatch('dialog/toast', this.$t('block-rate-limit'))
        }
      }
      await this.refresh()
    },

    async overrideHidden () {
      const overridenPost = await fetchPost({ postId: this.postId, context: { ...this.$route.query, override_hidden: true } })
      this.post = { ...overridenPost, comments: this.post.comments, side_articles: this.post.side_articles }
      document.title = `Ara - ${this.post.title}`
    },
    async overrideHiddenComment ({ commentId }) {
      const overriddenComment = await fetchComment({
        commentId,
        context: { ...this.$route.query, override_hidden: true }
      })

      for (const [commentIndex, comment] of this.post.comments.entries()) {
        if (comment.id === commentId) {
          const newComment = { ...comment, ...overriddenComment }
          return this.$set(this.post.comments, commentIndex, newComment)
        }
        for (const [replyCommentIndex, replyComment] of comment.comments.entries()) {
          if (replyComment.id === commentId) {
            const newComment = { ...replyComment, ...overriddenComment }
            return this.$set(this.post.comments[commentIndex].comments, replyCommentIndex, newComment)
          }
        }
      }
    }
  }
}

const Post = ({ postId }: PostProps) => {
  const { t } = useTranslation(["page"]);



  return (
    <TheLayout key="postId" className="post">
      <template #aside-right>
        <TheSidebar />
      </template>

      <ThePostHeader
        :post="post"
        :context="context"
        @archive="archive"
        @report="report"
        @vote="vote"
      />

      <ThePostDetail
        :post="post"
        @archive="archive"
        @block="block"
        @report="report"
        @vote="vote"
        @show-hidden="overrideHidden"
      />

      <ThePostComments
        :post="post"
        :comments="post.comments"
        @upload="addNewComment"
        @update="updateComment"
        @refresh="refresh"
        @fetch-comment="overrideHiddenComment"
      />
      <ThePostNavigation :post="post" :context="context" />
      <!-- @TODO: <TheBoard :board="board"/> -->
    </TheLayout>
  )
}

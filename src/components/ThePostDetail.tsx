import React, { useState } from 'react'
import "./css/ThePostDetail.scss";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { getAttachmentUrls, deletePost as apiDeletePost } from '@/api'
import LikeButton from '@/components/LikeButton.tsx'
import TextEditor from '@/components/TheTextEditor.tsx'
import ThePostBookmark from '@/components/ThePostBookmark.tsx'
import { mapGetters } from 'vuex'

const ThePostDetail = (post: any) => {
  
  const userPictureUrl = post.created_by && post.created_by.profile.picture;
  const postAuthor = post.created_by && post.created_by.profile.nickname;
  const postAuthorId = post.created_by && post.created_by.id;
  const postId = post && post.id;
  const content = post.content;
  const isBlocked =post.created_by && post.created_by.is_blocked;
  const isMine = post && post.is_mine;
  const isRegular:boolean = post.name_type === 0;
  const isNotRealName:boolean = post.name_type !== 2;

  async function deletePost () {
    const result = await this.$store.dispatch('dialog/confirm', this.$t('confirm-delete'));
    if (!result) return

    await apiDeletePost(post.id);
    this.$router.go(-1);
  }

  return (
  <div className="post">
    <div v-if="attachments && attachments.length > 0" className="attachments">
      <div className="dropdown is-hoverable is-right">
        <div className="dropdown-trigger">
          <a
            className="attachments__title"
            aria-haspopup="true"
            aria-controls="dropdown-menu"
          >
            <span>
              {{ $t('attachments') }} {{ attachments.length }}
            </span>
          </a>
        </div>
        <div className="dropdown-menu">
          <div className="dropdown-content">
            <div
              v-for="{id, file, url} in attachments"
              :key="id"
              className="attachments__item dropdown-item"
            >
              <div>
                <a
                  :href="url"
                  target="_blank"
                  rel="noopener"
                >
                  {{ file }}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="content">
      <ThePostBookmark
        v-if="post.url"
        :node="{ attrs: { title: post.title, href: post.url } }"
        className="content__bookmark"
      />

      <TextEditor
        v-if="content"
        ref="editor"
        :editable="false"
        :content="content"
      />

      <div v-if="post.is_hidden" className="hidden-container">
        <div className="hidden-container__frame">
          <i className="material-icons">{{ hidden_icon }}</i>
        </div>
        <div v-html="hiddenReason" />
        <button
          v-if="post.can_override_hidden"
          className="button hidden-container__button"
          @click="$emit('show-hidden')"
        >
          {{ $t('show-hidden') }}
        </button>
      </div>
    </div>

    <div v-if="!post.is_hidden || !(post.name_type === 1)" className="post__footer">
      <LikeButton
        v-if="!post.is_hidden"
        :item="post"
        className="post__like"
        votable
        :is-mine="post.is_mine"
        @vote="$emit('vote', $event)"
      />
      <div :className="{ 'post__buttons--hidden': post.is_hidden }" className="post__buttons">
        <template v-if="isMine && (post.can_override_hidden !== false) && post.hidden_at === '0001-01-01T08:28:00+08:28'">
          <button className="button" @click="deletePost">
            <i className="like-button__icon material-icons-outlined">
              delete
            </i>
            {{ $t('delete') }}
          </button>

          <router-link
            :to="{
              name: 'write',
              params: {
                postId
              }
            }"
            className="button"
          >
            <i className="like-button__icon material-icons-outlined">
              edit
            </i>
            {{ $t('edit' ) }}
          </router-link>
        </template>
        <template v-else>
          <button
            v-if="isRegular"
            className="button"
            @click="$emit('block')"
          >
            <i className="like-button__icon material-icons-outlined">
              remove_circle_outline
            </i>
            {{ $t(isBlocked ? 'unblock' : 'block') }}
          </button>

          <button
            v-if="!post.is_hidden && isNotRealName"
            className="button"
            @click="$emit('report')"
          >
            <i className="like-button__icon material-icons-outlined">
              campaign
            </i>
            {{ $t('report') }}
          </button>
        </template>
        <button
          v-if="!post.is_hidden"
          className="button archive-button"
          @click="$emit('archive')"
        >
          <i className="like-button__icon material-icons-outlined">add</i>
          {{ $t(post.my_scrap ? 'unarchive' : 'archive') }}
        </button>
      </div>
    </div>
    <hr className="divider">
  </div>
  )
}

export default ThePostDetail;



<script>


export default {
  props: {
    post: {
      type: Object,
      required: true
    }
  },

  data () {
    return {
      attachments: null
    }
  },

  computed: {

    hiddenReason () {
      const title = `<div className="has-text-weight-bold"> ${this.post.why_hidden.map(v => i18n.t(v)).join('<br>')}</div>`
      const subtitile = this.post.can_override_hidden ? `<div>(${this.$t('hidden-notice-' + this.post.why_hidden[0])})</div>` : ''
      return title + subtitile
    },
    hidden_icon () {
      switch (this.post.why_hidden[0]) {
        case 'ADULT_CONTENT':
          return 'visibility_off'
        case 'SOCIAL_CONTENT':
          return 'visibility_off'
        case 'REPORTED_CONTENT':
          return 'warning'
        case 'BLOCKED_USER_CONTENT':
          return 'voice_over_off'
        default:
          return 'help_outline'
      }
    },
    ...mapGetters([ 'userId' ])
  },

  watch: {
    'post.attachments': {
      async handler (attachments) {
        if (!attachments) {
          return
        }
        const results = await getAttachmentUrls(attachments)
        this.attachments = results.map(({ data }) => ({
          url: data.file,
          file: decodeURIComponent(new URL(data.file).pathname.split('/').pop()),
          id: data.id
        }))
      },
      immediate: true
    }
  }
}
</script>


import "./css/TheFooter.scss";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const TheFooter = () => {
  const { t } = useTranslation(["page"]);
  const onChangeLang = () => {
    i18n.changeLanguage("ko");
  };

  return (
    <footer
      /* className="{ 'login-footer': this.$route.path === '/login' }"*/ className="the-footer"
    >
      <div className="footer-menu">
        <div className="footer-item logo-item">
          <a id="sparcs-logo" href="https://sparcs.org">
            <img src="src/assets/SparcsLogo.svg" alt="SPARCS" />
          </a>
          <div className="footer-contact-mobile is-hidden-tablet">
            {t("contact")}:
            <a href="mailto:new-ara@sparcs.org">new-ara@sparcs.org</a>
          </div>
        </div>

        <div className="footer-items">
          <div className="footer-item">
            {/* <Link to="/makers">{t("credit")}</Link> */}
          </div>

          <div className="footer-item">
            <a href="https://sparcs.org">{t("license")}</a>
          </div>

          <div className="footer-item">
            <a /*@click="$refs.terms.openTermsPopup()"*/>{t("rules")}</a>
          </div>
        </div>

        <div className="footer-contact is-hidden-mobile">
          {t("contact")}:
          <a href="mailto:new-ara@sparcs.org">new-ara@sparcs.org</a>
        </div>
      </div>
    </footer>
  );
};

export default TheFooter;

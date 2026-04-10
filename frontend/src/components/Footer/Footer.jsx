import React from 'react';
import { useTranslation } from 'react-i18next';
import './Footer.css';
import { assets } from '../../assets/assets';

const Footer = () => {
  const { t } = useTranslation();
  return (
  <footer className='ft-wrap' id='footer'>
    <div className='ft-inner'>
      <div className='ft-brand'>
        <span className='ft-brand-name'>Crave.</span>
        <p className='ft-tagline'>{t("ft_tagline")}</p>
        <div className='ft-socials'>
          <a href='#' className='ft-social'><img src={assets.facebook_icon} alt='Facebook' /></a>
          <a href='#' className='ft-social'><img src={assets.twitter_icon} alt='Twitter' /></a>
          <a href='#' className='ft-social'><img src={assets.linkedin_icon} alt='LinkedIn' /></a>
        </div>
      </div>

      <div className='ft-links'>
        <div className='ft-col'>
          <h4>{t("company")}</h4>
          <a href='#'>{t("home")}</a>
          <a href='#'>{t("about_us")}</a>
          <a href='#'>{t("careers")}</a>
          <a href='#'>{t("blog")}</a>
        </div>
        <div className='ft-col'>
          <h4>{t("support")}</h4>
          <a href='#'>{t("help_center")}</a>
          <a href='#'>{t("privacy_policy")}</a>
          <a href='#'>{t("terms_of_use")}</a>
          <a href='#'>{t("contact_us")}</a>
        </div>
        <div className='ft-col'>
          <h4>{t("get_in_touch")}</h4>
          <p>📞 +971 4 000 0000</p>
          <p>✉️ hello@crave.ae</p>
          <p>📍 {t("dubai_uae")}</p>
        </div>
      </div>
    </div>
    <div className='ft-bottom'>
      <p>{t("copyright")}</p>
      <p>{t("made_with_love")}</p>
    </div>
  </footer>
)};

export default Footer;
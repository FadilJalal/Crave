import React from 'react';
import './Footer.css';
import { assets } from '../../assets/assets';

const Footer = () => (
  <footer className='ft-wrap' id='footer'>
    <div className='ft-inner'>
      <div className='ft-brand'>
        <span className='ft-brand-name'>Crave.</span>
        <p className='ft-tagline'>Fast, fresh, and always on time. Your favourite food, delivered.</p>
        <div className='ft-socials'>
          <a href='#' className='ft-social'><img src={assets.facebook_icon} alt='Facebook' /></a>
          <a href='#' className='ft-social'><img src={assets.twitter_icon} alt='Twitter' /></a>
          <a href='#' className='ft-social'><img src={assets.linkedin_icon} alt='LinkedIn' /></a>
        </div>
      </div>

      <div className='ft-links'>
        <div className='ft-col'>
          <h4>Company</h4>
          <a href='#'>Home</a>
          <a href='#'>About Us</a>
          <a href='#'>Careers</a>
          <a href='#'>Blog</a>
        </div>
        <div className='ft-col'>
          <h4>Support</h4>
          <a href='#'>Help Center</a>
          <a href='#'>Privacy Policy</a>
          <a href='#'>Terms of Use</a>
          <a href='#'>Contact Us</a>
        </div>
        <div className='ft-col'>
          <h4>Get in Touch</h4>
          <p>📞 +971 4 000 0000</p>
          <p>✉️ hello@crave.ae</p>
          <p>📍 Dubai, UAE</p>
        </div>
      </div>
    </div>
    <div className='ft-bottom'>
      <p>© 2025 Crave. All rights reserved.</p>
      <p>Made with ❤️ in Dubai</p>
    </div>
  </footer>
);

export default Footer;
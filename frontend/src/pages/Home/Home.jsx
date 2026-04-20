import React, { useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './Home.css'
import Header from '../../components/Header/Header'
import HeaderMarquee from '../../components/HeaderMarquee/HeaderMarquee'
import TopRestaurants from '../../components/TopRestaurants/TopRestaurants'
import FoodDisplay from '../../components/FoodDisplay/FoodDisplay'
import SmartTopPick from '../../components/SmartTopPick/SmartTopPick'
import MoodPicker from '../../components/MoodPicker/MoodPicker'
import CraveLivePulse from '../../components/CraveLivePulse/CraveLivePulse'
import { StoreContext } from '../../Context/StoreContext'
import { useEffect } from 'react'

const Home = () => {
  const { t } = useTranslation();
  const [category, setCategory] = useState("All")
  const navigate = useNavigate()
  const { cartItems, currency, getTotalCartAmount, food_list } = useContext(StoreContext)

  const totalItems = useMemo(() => {
    if (!cartItems || !food_list.length) return 0;
    return Object.values(cartItems).reduce((sum, entry) => {
      const exists = food_list.some(f => f._id === entry.itemId);
      return exists ? sum + (entry.quantity || 0) : sum;
    }, 0);
  }, [cartItems, food_list])

  const subtotal = getTotalCartAmount()

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    const revealed = document.querySelectorAll('.reveal');
    revealed.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Header />
      <HeaderMarquee />
      <div className="reveal-on-scroll reveal">
        <CraveLivePulse />
      </div>
      <div className="reveal-on-scroll reveal">
        <SmartTopPick />
      </div>
      <div className="reveal-on-scroll reveal">
        <TopRestaurants />
      </div>
      <div className="reveal-on-scroll reveal">
        <MoodPicker />
      </div>
      <div className="reveal-on-scroll reveal">
        <FoodDisplay category={category} />
      </div>
      <div className="app-container">
      </div>

      {totalItems > 0 && (
        <div className="home-mini-cart">
          <div className="home-mini-cart-info">
            <p className="home-mini-cart-count">{t("items_in_cart", { count: totalItems })}</p>
            <p className="home-mini-cart-total">{t("subtotal")}: {currency}{subtotal.toFixed(2)}</p>
          </div>
          <button
            className="home-mini-cart-btn"
            onClick={() => navigate('/cart')}
          >
            {t("view_cart")}
          </button>
        </div>
      )}
    </>
  )
}

export default Home
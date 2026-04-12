import React, { useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './Home.css'
import Header from '../../components/Header/Header'
import HeaderMarquee from '../../components/HeaderMarquee/HeaderMarquee'
import TopRestaurants from '../../components/TopRestaurants/TopRestaurants'
import FoodDisplay from '../../components/FoodDisplay/FoodDisplay'
import FlashDeals from '../../components/FlashDeals/FlashDeals'
import SmartTopPick from '../../components/SmartTopPick/SmartTopPick'
import MoodPicker from '../../components/MoodPicker/MoodPicker'
import { StoreContext } from '../../Context/StoreContext'

const Home = () => {
  const { t } = useTranslation();
  const [category, setCategory] = useState("All")
  const navigate = useNavigate()
  const { cartItems, currency, getTotalCartAmount } = useContext(StoreContext)

  const totalItems = useMemo(() => {
    return Object.values(cartItems || {}).reduce((sum, entry) => sum + (entry.quantity || 0), 0)
  }, [cartItems])

  const subtotal = getTotalCartAmount()

  return (
    <>
      <Header />
      <HeaderMarquee />
      <SmartTopPick />
      <FlashDeals />
      <TopRestaurants />
      <MoodPicker />
      <FoodDisplay category={category} />
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
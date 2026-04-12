import React, { useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './Home.css'
import Header from '../../components/Header/Header'
import TopPicks from '../../components/TopPicks/TopPicks'
import HighlightGrid from '../../components/HighlightGrid/HighlightGrid'
import FoodDisplay from '../../components/FoodDisplay/FoodDisplay'
import AIRecommendations from '../../components/AIRecommendations/AIRecommendations'
import FoodChat from '../../components/FoodChat/FoodChat'
import FlashDeals from '../../components/FlashDeals/FlashDeals'
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
      <TopPicks />
      <div className="app-container">
        <FlashDeals />
        <FoodDisplay category={category} />
        <div className="home-divider" />
        <AIRecommendations />
        <FoodChat />
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
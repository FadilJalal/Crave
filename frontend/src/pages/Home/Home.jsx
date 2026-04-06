import React, { useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Home.css'
import Header from '../../components/Header/Header'
import ExploreMenu from '../../components/ExploreMenu/ExploreMenu'
import FoodDisplay from '../../components/FoodDisplay/FoodDisplay'
import AIRecommendations from '../../components/AIRecommendations/AIRecommendations'
import PersonalisedBanner from '../../components/PersonalisedBanner/PersonalisedBanner'
import FoodChat from '../../components/FoodChat/FoodChat'
import SmartSearch from '../../components/SmartSearch/SmartSearch'
import MoodPicker from '../../components/MoodPicker/MoodPicker'
import ReorderNudge from '../../components/ReorderNudge/ReorderNudge'
import { StoreContext } from '../../Context/StoreContext'

const Home = () => {
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
      <PersonalisedBanner />
      <ReorderNudge />

      <SmartSearch />

      <ExploreMenu setCategory={setCategory} category={category} />
      <FoodDisplay category={category} />

      <div className="home-divider" />

      <MoodPicker />

      <div className="home-divider" />

      <AIRecommendations />
      <FoodChat />

      {totalItems > 0 && (
        <div className="home-mini-cart">
          <div className="home-mini-cart-info">
            <p className="home-mini-cart-count">{totalItems} item{totalItems !== 1 ? 's' : ''} in cart</p>
            <p className="home-mini-cart-total">Subtotal: {currency}{subtotal.toFixed(2)}</p>
          </div>
          <button
            className="home-mini-cart-btn"
            onClick={() => navigate('/cart')}
          >
            View Cart
          </button>
        </div>
      )}
    </>
  )
}
export default Home
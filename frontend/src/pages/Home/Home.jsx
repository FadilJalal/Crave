import React, { useState } from 'react'
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

const Home = () => {
  const [category, setCategory] = useState("All")
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
    </>
  )
}
export default Home
import React, { useState } from 'react'
import Header from '../../components/Header/Header'
import ExploreMenu from '../../components/ExploreMenu/ExploreMenu'
import FoodDisplay from '../../components/FoodDisplay/FoodDisplay'
import AIRecommendations from '../../components/AIRecommendations/AIRecommendations'
import PersonalisedBanner from '../../components/PersonalisedBanner/PersonalisedBanner'
import FoodChat from '../../components/FoodChat/FoodChat'

const Home = () => {
  const [category, setCategory] = useState("All")
  return (
    <>
      <Header />
      <PersonalisedBanner />
      <ExploreMenu setCategory={setCategory} category={category} />
      <AIRecommendations />
      <FoodDisplay category={category} />
      <FoodChat />
    </>
  )
}
export default Home
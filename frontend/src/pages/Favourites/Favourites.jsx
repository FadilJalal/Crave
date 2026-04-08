import React, { useContext } from "react";
import "./Favourites.css";
import { StoreContext } from "../../Context/StoreContext";
import { Heart } from "lucide-react";
import FoodItem from "../../components/FoodItem/FoodItem";

export default function Favourites() {
  const { favourites = [], food_list = [] } = useContext(StoreContext);

  return (
    <div className="favourites-page-main">
      <h2 className="favourites-title">
        <Heart className="favourites-heart" fill="#ff3a0a" stroke="#ff3a0a" /> My Favourites
      </h2>
      <p className="favourites-desc">All your favourite dishes in one place.</p>
      <div className="favourites-list-horizontal">
        {favourites.length === 0 ? (
          <div className="favourites-empty">No favourites yet. Tap the heart <Heart className="favourites-heart-inline" fill="#ff3a0a" stroke="#ff3a0a" /> on any menu item to add.</div>
        ) : (
          <div className="favourites-row-scroll">
            {favourites.map((item, idx) => {
              const full = food_list.find(f => f._id === item._id) || item;
              return (
                <div key={idx} className="favourites-fooditem-wrap">
                  <FoodItem {...full} id={full._id} forceFavourite />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
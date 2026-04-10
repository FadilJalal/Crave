import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import "./Favourites.css";
import { StoreContext } from "../../Context/StoreContext";
import { Heart } from "lucide-react";
import FoodItem from "../../components/FoodItem/FoodItem";

export default function Favourites() {
  const { t } = useTranslation();
  const { favourites = [], food_list = [] } = useContext(StoreContext);

  return (
    <div className="favourites-page-main">
      <h2 className="favourites-title">
        <Heart className="favourites-heart" fill="#ff3a0a" stroke="#ff3a0a" /> {t("my_favourites")}
      </h2>
      <p className="favourites-desc">{t("favourites_desc")}</p>
      <div className="favourites-list-horizontal">
        {favourites.length === 0 ? (
          <div className="favourites-empty">{t("no_favourites_yet")}<Heart className="favourites-heart-inline" fill="#ff3a0a" stroke="#ff3a0a" />{t("on_any_menu_item_to_add")}</div>
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
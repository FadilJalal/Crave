// Utility for accessing saved cards in localStorage
const CARD_KEY = "crave_saved_cards";
export function getSavedCards() {
  try {
    return JSON.parse(localStorage.getItem(CARD_KEY)) || [];
  } catch {
    return [];
  }
}
export function saveCards(cards) {
  localStorage.setItem(CARD_KEY, JSON.stringify(cards));
}
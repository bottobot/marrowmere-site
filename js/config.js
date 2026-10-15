/* Marrowmere site configuration: the only file to edit before deploy.
   Empty store URLs render as disabled "Coming soon" buttons, never dead links.
   An empty newsletterAction makes the sign-up form say the list opens soon. */
window.MARROWMERE_CONFIG = {
  title: "Marrowmere",
  studio: "Keepstone Games",
  release: "Coming 2027",
  siteUrl: "https://bottobot.github.io/marrowmere-site",       // owner replaces before deploy
  editions: {
    standard: { name: "Standard Edition", price: "$9.99" },
    deluxe:   { name: "Deluxe Edition",   price: "$14.99" }
  },
  stores: { steam: "", itch: "", gog: "" },          // empty = "Coming soon" disabled button
  pressEmail: "",
  newsletterAction: ""                               // empty = form shows "Mailing list opens soon. Wishlist on Steam to hear first."
};

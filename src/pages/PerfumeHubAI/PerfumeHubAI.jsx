import React, { useState, useContext, useEffect } from 'react';
import { ShopContext } from '../../context/ShopContext';
import ProductCard from '../../components/ProductCard/ProductCard';
import './PerfumeHubAI.css';
import { Sparkles, ArrowRight, ArrowLeft, RefreshCw, Zap, Moon, Sun, ShoppingBag } from 'lucide-react';

// Static Data moved outside component for stability and performance
const QUESTIONS = [
    {
        id: 'gender',
        title: 'Who is this fragrance for?',
        options: [
            { id: 'men', label: 'For Men', icon: '♂️' },
            { id: 'women', label: 'For Women', icon: '♀️' },
            { id: 'unisex', label: 'Unisex', icon: '⚧️' }
        ]
    },
    {
        id: 'profile',
        title: 'Which scent profile do you prefer?',
        options: [
            { id: 'woody', label: 'Woody & Earthy', icon: '🌲', expert: true },
            { id: 'floral', label: 'Floral & Sweet', icon: '🌸', expert: true },
            { id: 'arabic', label: 'Arabic & Oriental', icon: '🕌', expert: true },
            { id: 'spicy', label: 'Spicy & Bold', icon: '🌶️', expert: true },
            { id: 'fresh', label: 'Fresh & Citrus', icon: '🌊', expert: true },
            { id: 'gourmand', label: 'Gourmand (Sweet/Foody)', icon: '🧁', expert: true }
        ]
    },
    {
        id: 'vibe',
        title: 'What is your desired vibe?',
        expertOnly: true,
        options: [
            { id: 'elegant', label: 'Elegant & Sophisticated', icon: '🎩' },
            { id: 'bold', label: 'Bold & Rebellious', icon: '🤘' },
            { id: 'romantic', label: 'Romantic & Soft', icon: '💖' },
            { id: 'mysterious', label: 'Mysterious & Deep', icon: '🌑' }
        ]
    },
    {
        id: 'note',
        title: 'Which key note do you love?',
        expertOnly: true,
        options: [
            { id: 'oud', label: 'Oud / Agarwood', icon: '🪵' },
            { id: 'vanilla', label: 'Vanilla / Sweet', icon: '🍦' },
            { id: 'rose', label: 'Rose / Jasmine', icon: '🌹' },
            { id: 'citrus', label: 'Lemon / Bergamot', icon: '🍋' },
            { id: 'musk', label: 'Musk / Clean', icon: '🫧' }
        ]
    },
    {
        id: 'season',
        title: 'When will you be wearing this?',
        expertOnly: true,
        options: [
            { id: 'winter', label: 'Cold / Winter', icon: '❄️' },
            { id: 'summer', label: 'Warm / Summer', icon: '☀️' },
            { id: 'all', label: 'All Seasons', icon: '📅' }
        ]
    },
    {
        id: 'occasion',
        title: 'On what occasion?',
        options: [
            { id: 'daily', label: 'Daily / Office', icon: <Sun size={32} /> },
            { id: 'night', label: 'Night / Events', icon: <Moon size={32} /> },
            { id: 'sporty', label: 'Sporty / Active', icon: <Zap size={32} /> }
        ]
    }
];

const EXTERNAL_DATABASE = [
    // ─── FRESH / CITRUS ───────────────────────────────────────────────────
    { name:"Acqua di Giò Profumo", brand:"Giorgio Armani", notes:"Bergamot, Sea Notes, Geranium, Sage, Incense, Patchouli.", reason:"The definition of fresh-aquatic elegance. Incredibly long-lasting on skin.", profile:['fresh'], keyNotes:['citrus','musk'], vibes:['elegant','romantic'], seasons:['summer','all'], occasions:['daily','night'], gender:'men' },
    { name:"Voyage d'Hermès", brand:"Hermès", notes:"Cardamom, Lemon, Spices, Tea, Floral Notes, Green Notes, Musk.", reason:"An airy, spicy-fresh travel companion. Elegant and sophisticated for any climate.", profile:['fresh','spicy'], keyNotes:['citrus','musk'], vibes:['elegant'], seasons:['all','summer'], occasions:['daily'], gender:'unisex' },
    { name:"Silver Mountain Water", brand:"Creed", notes:"Bergamot, Mandarin Orange, Green Tea, Black Currant, Musk, Sandalwood.", reason:"Inspired by the crisp air of the Swiss Alps. Pure, metallic freshness.", profile:['fresh'], keyNotes:['citrus','musk'], vibes:['elegant'], seasons:['summer','all'], occasions:['daily','sporty'], gender:'unisex' },
    { name:"Bleu de Chanel EDP", brand:"Chanel", notes:"Grapefruit, Lemon, Mint, Pink Pepper, Ginger, Cedar, Sandalwood.", reason:"The gold standard of masculine versatility. Works for any occasion.", profile:['fresh','woody'], keyNotes:['citrus','musk'], vibes:['elegant','mysterious'], seasons:['all'], occasions:['daily','night'], gender:'men' },
    { name:"Light Blue", brand:"Dolce & Gabbana", notes:"Sicilian Lemon, Apple, Cedar, Bamboo, White Rose, Jasmine.", reason:"Crisp, clean, and effortlessly Mediterranean. Perfect for warm months.", profile:['fresh','floral'], keyNotes:['citrus','rose'], vibes:['romantic','elegant'], seasons:['summer','all'], occasions:['daily','sporty'], gender:'women' },
    { name:"Light Blue Pour Homme", brand:"Dolce & Gabbana", notes:"Sicilian Mandarin, Grapefruit, Brazilian Rosewood, Blue Musk.", reason:"Fresh, aquatic, and masculine. A summer staple that never gets old.", profile:['fresh'], keyNotes:['citrus','musk'], vibes:['elegant','romantic'], seasons:['summer'], occasions:['daily','sporty'], gender:'men' },
    { name:"Versace Eros Energy", brand:"Versace", notes:"Lemon, Amber, Oakmoss, Musk.", reason:"An absolute citrus bomb — bright and bold. Impressive sillage.", profile:['fresh'], keyNotes:['citrus'], vibes:['bold','elegant'], seasons:['summer','all'], occasions:['daily'], gender:'men' },
    { name:"CK One", brand:"Calvin Klein", notes:"Cardamom, Bergamot, Pineapple, Papaya, Green Tea, Rose, Jasmine, Violet.", reason:"The iconic clean unisex classic. Fresh, effortless, and universally loved.", profile:['fresh'], keyNotes:['citrus','musk'], vibes:['elegant','romantic'], seasons:['summer','all'], occasions:['daily','sporty'], gender:'unisex' },
    { name:"Issey Miyake L'Eau d'Issey Pour Homme", brand:"Issey Miyake", notes:"Yuzu Citrus, Nutmeg, Cyclamen, Calone, Sandalwood, Musk.", reason:"Pioneering fresh-aquatic composition. Clean, watery, and effortlessly modern.", profile:['fresh'], keyNotes:['citrus','musk'], vibes:['elegant'], seasons:['summer','all'], occasions:['daily','sporty'], gender:'men' },
    { name:"Polo 67", brand:"Ralph Lauren", notes:"Bergamot, Lemon, Pineapple, Juniper, Rose Hip, Vetiver.", reason:"Effortlessly sporty yet refined. The scent of clean confidence.", profile:['fresh'], keyNotes:['citrus','musk'], vibes:['elegant'], seasons:['summer','all'], occasions:['sporty','daily'], gender:'men' },
    { name:"Davidoff Cool Water", brand:"Davidoff", notes:"Mint, Green Nuances, Lavender, Coriander, Oakmoss, Cedar, Tobacco.", reason:"The ultimate fresh-aquatic classic. Invigorating and timeless.", profile:['fresh'], keyNotes:['citrus','musk'], vibes:['bold','elegant'], seasons:['summer'], occasions:['sporty','daily'], gender:'men' },
    { name:"Versace Pour Homme", brand:"Versace", notes:"Bergamot, Lemon, Neroli, Hyacinth, Cedar, Musk.", reason:"Mediterranean elegance in a bottle. Light enough for everyday, refined enough for occasions.", profile:['fresh','floral'], keyNotes:['citrus','musk'], vibes:['elegant','romantic'], seasons:['summer','all'], occasions:['daily'], gender:'men' },
    { name:"Acqua di Parma Colonia", brand:"Acqua di Parma", notes:"Calabrian Bergamot, Sicilian Lemon, Sweet Orange, Lavender, Rosemary, Vetivert.", reason:"The original Italian cologne. Radiates sunshine, effortless class, and heritage.", profile:['fresh'], keyNotes:['citrus','musk'], vibes:['elegant'], seasons:['summer','all'], occasions:['daily'], gender:'unisex' },
    { name:"Jo Malone Lime Basil & Mandarin", brand:"Jo Malone London", notes:"Lime, Basil, White Thyme, Mandarin, Patchouli, Amber.", reason:"A pioneering London Cologne. Sharp, green, and unmistakably sophisticated.", profile:['fresh'], keyNotes:['citrus','musk'], vibes:['elegant','mysterious'], seasons:['summer','all'], occasions:['daily'], gender:'unisex' },
    { name:"Bulgari Aqva Pour Homme", brand:"Bvlgari", notes:"Poseidon Wood, Marine Accord, Citrus Woods, Neptune Grass.", reason:"Aquatic and clean. Like diving into the crystal-clear Mediterranean sea.", profile:['fresh'], keyNotes:['citrus','musk'], vibes:['elegant'], seasons:['summer'], occasions:['sporty','daily'], gender:'men' },
    { name:"DKNY Be Delicious Women", brand:"DKNY", notes:"Green Apple, Magnolia, Rose, Sandalwood, Musk.", reason:"An iconic urban scent — fresh apple meets clean florals in a classic New York bottle.", profile:['fresh','floral'], keyNotes:['citrus','rose'], vibes:['romantic'], seasons:['summer','all'], occasions:['daily'], gender:'women' },
    { name:"Nautica Voyage", brand:"Nautica", notes:"Apple, Water Lotus, Mimosa, Oakmoss, Musk, Cedar.", reason:"Stunningly affordable aquatic fresh. Punches way above its price point.", profile:['fresh'], keyNotes:['citrus','musk'], vibes:['elegant'], seasons:['summer','all'], occasions:['sporty','daily'], gender:'men' },

    // ─── FLORAL ───────────────────────────────────────────────────────────
    { name:"Miss Dior EDP", brand:"Dior", notes:"Blood Orange, Lily of the Valley, Rose, Grasse Rose, Patchouli.", reason:"Timeless romantic femininity. The scent of a woman who knows herself.", profile:['floral'], keyNotes:['rose','citrus'], vibes:['romantic','elegant'], seasons:['all'], occasions:['daily','night'], gender:'women' },
    { name:"Delina", brand:"Parfums de Marly", notes:"Rhubarb, Lychee, Bergamot, Turkish Rose, Peony, Vanilla, Musk.", reason:"A modern masterpiece of floral femininity. Sweet, tart, and wildly popular.", profile:['floral'], keyNotes:['rose','vanilla'], vibes:['romantic','bold'], seasons:['all','summer'], occasions:['daily','night'], gender:'women' },
    { name:"Si Passione", brand:"Giorgio Armani", notes:"Pink Pepper, Pear, Blackcurrant, Rose, Jasmine, Heliotrope, Vanilla, Cedar.", reason:"Red-bottle confidence. A floral-fruity siren song of passion.", profile:['floral','gourmand'], keyNotes:['rose','vanilla'], vibes:['bold','romantic'], seasons:['all'], occasions:['night'], gender:'women' },
    { name:"La Vie Est Belle", brand:"Lancôme", notes:"Black Currant, Pear, Iris, Jasmine, Orange Blossom, Vanilla, Praline.", reason:"A symbol of joy and femininity. Long-lasting and broadly adored.", profile:['floral','gourmand'], keyNotes:['vanilla','rose'], vibes:['romantic','elegant'], seasons:['all','winter'], occasions:['daily','night'], gender:'women' },
    { name:"Gucci Bloom", brand:"Gucci", notes:"Tuberose, Jasmine, Rangoon Creeper, Musk.", reason:"Rich, lush, full-bodied white floral. Confident and radiant femininity.", profile:['floral'], keyNotes:['rose','musk'], vibes:['bold','romantic'], seasons:['all'], occasions:['night','daily'], gender:'women' },
    { name:"Narciso Rodriguez For Her EDP", brand:"Narciso Rodriguez", notes:"Osmanthus, Bergamot, Rose Accord, Musk, Amber.", reason:"Hypnotic skin-like musk. Gets better as it wears — endlessly flattering.", profile:['floral','woody'], keyNotes:['musk','rose'], vibes:['romantic','elegant'], seasons:['all'], occasions:['daily','night'], gender:'women' },
    { name:"Marc Jacobs Daisy", brand:"Marc Jacobs", notes:"Strawberry, Violet Leaf, Ruby Red Grapefruit, Gardenia, Jasmine.", reason:"Playful, fresh, and feminine. The go-to scent for spring and casual outings.", profile:['floral','fresh'], keyNotes:['rose','citrus'], vibes:['romantic'], seasons:['summer','all'], occasions:['daily','sporty'], gender:'women' },
    { name:"Chanel No.5", brand:"Chanel", notes:"Aldehydes, Ylang-Ylang, Rose, Jasmine, Iris, Sandalwood, Vetiver, Vanilla.", reason:"The most iconic women's fragrance ever created. Timeless, powerful, legendary.", profile:['floral'], keyNotes:['rose','vanilla'], vibes:['elegant'], seasons:['all'], occasions:['night','daily'], gender:'women' },
    { name:"Valentino Donna Born in Roma", brand:"Valentino", notes:"Black Currant, Jasmine, Vanilla, White Musk.", reason:"Confident and sensual femininity rooted in Roman beauty and style.", profile:['floral','gourmand'], keyNotes:['vanilla','rose'], vibes:['elegant','romantic'], seasons:['all'], occasions:['night','daily'], gender:'women' },
    { name:"Givenchy L'Interdit EDP", brand:"Givenchy", notes:"Jasmine, Orange Blossom, White Peach, Tuberose, Vetiver, Patchouli.", reason:"Dark and luminous. A white floral with a secret shadow underneath.", profile:['floral'], keyNotes:['rose','musk'], vibes:['mysterious','elegant'], seasons:['all'], occasions:['night'], gender:'women' },
    { name:"Lancôme Trésor", brand:"Lancôme", notes:"Peach, Apricot, Rose, Iris, Heliotrope, Musk, Sandalwood, Amber.", reason:"Classic, powdery-soft femininity. An icon of Parisian romance.", profile:['floral'], keyNotes:['rose','vanilla'], vibes:['romantic','elegant'], seasons:['all'], occasions:['daily','night'], gender:'women' },
    { name:"Viktor & Rolf Flowerbomb", brand:"Viktor & Rolf", notes:"Bergamot, Jasmine, Cattleya Orchid, Freesia, Patchouli, Rose.", reason:"An explosion of flowers — warm, intoxicating, and utterly addictive.", profile:['floral','gourmand'], keyNotes:['rose','vanilla'], vibes:['bold','romantic'], seasons:['winter','all'], occasions:['night','daily'], gender:'women' },
    { name:"Chloe EDP", brand:"Chloe", notes:"Peony, Lychee, Magnolia, Rose, Cedar, Amber.", reason:"Modern femininity in its purest form. Soft, powdery, and eternally graceful.", profile:['floral'], keyNotes:['rose','musk'], vibes:['elegant','romantic'], seasons:['all'], occasions:['daily'], gender:'women' },
    { name:"Burberry Her", brand:"Burberry", notes:"Blueberry, Jasmine, Violet, Amber.", reason:"Bright and berry-sweet. A British floral-fruity icon for the modern woman.", profile:['floral','fresh'], keyNotes:['rose','citrus'], vibes:['romantic'], seasons:['all','summer'], occasions:['daily'], gender:'women' },
    { name:"Miu Miu EDP", brand:"Miu Miu", notes:"Lily of the Valley, Iris, White Musk.", reason:"Effortlessly chic and feminine. A pure, modern take on Parisian florals.", profile:['floral'], keyNotes:['rose','musk'], vibes:['elegant','romantic'], seasons:['all'], occasions:['daily'], gender:'women' },
    { name:"Jimmy Choo EDP", brand:"Jimmy Choo", notes:"Pear, Italian Bluebell, Mandarin, Tiger Lily, Toffee, Sandalwood.", reason:"Sensual and sophisticated. The shoe icon's signature fragrance.", profile:['floral','gourmand'], keyNotes:['vanilla','rose'], vibes:['elegant','bold'], seasons:['all'], occasions:['night'], gender:'women' },
    { name:"YSL Libre", brand:"Yves Saint Laurent", notes:"Lavender, Vanilla Dew, Orange Blossom, White Musks.", reason:"The freedom to be yourself. A bold lavender-vanilla statement from YSL.", profile:['floral','gourmand'], keyNotes:['vanilla','musk'], vibes:['bold','elegant'], seasons:['all'], occasions:['daily','night'], gender:'women' },
    { name:"Frederic Malle Portrait of a Lady", brand:"Frederic Malle", notes:"Rose, Blackcurrant, Sandalwood, Patchouli, Raspberry, Cinnamon.", reason:"A masterpiece of rose — dense, dark, literary. For connoisseurs of floral niche.", profile:['floral','arabic'], keyNotes:['rose','oud'], vibes:['mysterious','elegant'], seasons:['winter','all'], occasions:['night'], gender:'women' },

    // ─── WOODY / EARTHY ───────────────────────────────────────────────────
    { name:"Aventus", brand:"Creed", notes:"Pineapple, Bergamot, Birch, Patchouli, Musk, Oakmoss, Vanilla.", reason:"King of men's fragrances. Radiates success, ambition, and refinement.", profile:['woody'], keyNotes:['musk','citrus'], vibes:['bold','elegant'], seasons:['all'], occasions:['daily','night'], gender:'men' },
    { name:"Green Irish Tweed", brand:"Creed", notes:"Lemon Verbena, Iris, Violet Leaf, Sandalwood, Ambergris.", reason:"The quintessential country estate fragrance. Fresh, grassy, and deeply refined.", profile:['woody','fresh'], keyNotes:['musk','citrus'], vibes:['elegant'], seasons:['all','summer'], occasions:['daily'], gender:'men' },
    { name:"L'Eau d'Issey Pour Homme Intense", brand:"Issey Miyake", notes:"Yuzu, Bergamot, Papyrus, Incense, Amber, Benzoin.", reason:"A dark, smoky evolution of the classic Issey Miyake. Mysterious and unique.", profile:['woody','arabic'], keyNotes:['oud','citrus'], vibes:['mysterious','elegant'], seasons:['winter','all'], occasions:['night'], gender:'men' },
    { name:"Oud Wood", brand:"Tom Ford", notes:"Oud, Rosewood, Cardamom, Sandalwood, Vetiver, Amber.", reason:"Perfectly balanced oud — not too heavy, remains luxurious and sophisticated.", profile:['woody','arabic'], keyNotes:['oud','musk'], vibes:['mysterious','elegant'], seasons:['winter','all'], occasions:['night','daily'], gender:'unisex' },
    { name:"Armani Code EDP", brand:"Giorgio Armani", notes:"Lemon, Bergamot, Olive Flower, Guaiac Wood, Tonka Bean.", reason:"Dark, sensual wood. The nighttime companion for the sophisticated man.", profile:['woody'], keyNotes:['musk','citrus'], vibes:['mysterious','elegant'], seasons:['winter','all'], occasions:['night'], gender:'men' },
    { name:"Terre d'Hermès EDP", brand:"Hermès", notes:"Grapefruit, Orange, Flint, Pepper, Cedar, Patchouli, Vetiver.", reason:"A poetic dialogue between earth and sky. Understated, deeply distinguished.", profile:['woody','fresh'], keyNotes:['citrus','musk'], vibes:['elegant','mysterious'], seasons:['all'], occasions:['daily'], gender:'men' },
    { name:"Chanel Allure Homme Sport", brand:"Chanel", notes:"Lemon, Mint, Star Anise, Cedar, Tonka Bean, White Musk.", reason:"Sport meets elegance. Clean, fresh, and quietly impressive.", profile:['woody','fresh'], keyNotes:['citrus','musk'], vibes:['elegant'], seasons:['summer','all'], occasions:['sporty','daily'], gender:'men' },
    { name:"Dior Homme Parfum", brand:"Dior", notes:"Iris, Vetiver, Amber, Leather.", reason:"The most masculine iris ever created. Dark, powdery, intensely seductive.", profile:['woody'], keyNotes:['musk'], vibes:['mysterious','elegant'], seasons:['winter'], occasions:['night'], gender:'men' },
    { name:"Tom Ford Grey Vetiver", brand:"Tom Ford", notes:"Grapefruit, Petitgrain, Sage, Vetiver, Oakmoss, Amber.", reason:"Understated aristocratic grooming. A vetiver done with absolute precision.", profile:['woody'], keyNotes:['musk','citrus'], vibes:['elegant'], seasons:['all'], occasions:['daily'], gender:'men' },
    { name:"Montblanc Explorer", brand:"Montblanc", notes:"Bergamot, Vetiver, Ambroxan, Patchouli.", reason:"Like Aventus but more accessible. A genuine crowd-pleaser with great carry.", profile:['woody','fresh'], keyNotes:['musk','citrus'], vibes:['bold','elegant'], seasons:['all'], occasions:['daily','night'], gender:'men' },
    { name:"YSL L'Homme", brand:"Yves Saint Laurent", notes:"Bergamot, Ginger, Basil, Cardamom, Vetiver, White Suede, Tobacco.", reason:"Sophisticated and grounded. The YSL man at his most confident.", profile:['woody'], keyNotes:['musk','citrus'], vibes:['elegant','mysterious'], seasons:['all'], occasions:['daily','night'], gender:'men' },
    { name:"Prada L'Homme", brand:"Prada", notes:"Iris, Amber, Patchouli, Geranium, Sandalwood.", reason:"Powdery iris meets clean wood. A fragrance of quiet, confident masculinity.", profile:['woody'], keyNotes:['musk'], vibes:['elegant'], seasons:['all'], occasions:['daily'], gender:'men' },
    { name:"Byredo Gypsy Water", brand:"Byredo", notes:"Bergamot, Lemon, Pepper, Juniper, Pine Needles, Incense, Sandalwood.", reason:"Nomadic and enchanting. For the free spirit who refuses to be defined.", profile:['woody','fresh'], keyNotes:['citrus','musk'], vibes:['mysterious','romantic'], seasons:['all'], occasions:['daily'], gender:'unisex' },
    { name:"Boss Bottled Absolute", brand:"Hugo Boss", notes:"Incense, Leather, Myrrh, Patchouli.", reason:"Niche-quality leather and incense at a designer price. Addictive and commanding.", profile:['woody','spicy'], keyNotes:['musk','oud'], vibes:['bold','elegant'], seasons:['winter','all'], occasions:['night','daily'], gender:'men' },
    { name:"Ermenegildo Zegna Essenze Cypresso", brand:"Ermenegildo Zegna", notes:"Cypress, Lemon, Rosemary, Vetiver.", reason:"Italian countryside in a bottle. Refined, green, and quietly proud.", profile:['woody','fresh'], keyNotes:['citrus','musk'], vibes:['elegant'], seasons:['all'], occasions:['daily'], gender:'men' },
    { name:"Le Labo Santal 33", brand:"Le Labo", notes:"Cardamom, Iris, Violet, Ambrette Seeds, Sandalwood, Cedarwood, Papyrus.", reason:"The cult New York sandalwood. Skin-intimate, gender-fluid, and deeply appealing.", profile:['woody'], keyNotes:['musk','vanilla'], vibes:['elegant','mysterious','romantic'], seasons:['all'], occasions:['daily'], gender:'unisex' },
    { name:"Diptyque Philosykos", brand:"Diptyque", notes:"Fig Leaf, Wood of Fig Tree, Fig Fruit, White Cedar.", reason:"Like standing under a fig tree in Provence. Crisp, creamy, and completely unique.", profile:['woody','fresh'], keyNotes:['musk'], vibes:['romantic','elegant'], seasons:['summer','all'], occasions:['daily'], gender:'unisex' },

    // ─── SPICY ────────────────────────────────────────────────────────────
    { name:"Sauvage Elixir", brand:"Dior", notes:"Cinnamon, Nutmeg, Cardamom, Grapefruit, Lavender, Sandalwood.", reason:"Among the most powerful and refined in complexity available at retail price.", profile:['spicy','woody'], keyNotes:['musk','citrus'], vibes:['bold','mysterious'], seasons:['winter','all'], occasions:['night','daily'], gender:'men' },
    { name:"Black Phantom", brand:"Kilian Paris", notes:"Rum, Sugar Cane, Dark Chocolate, Coffee, Caramel, Almond, Heliotrope, Sandalwood.", reason:"Memento Mori. A dark, boozy gourmand that is dangerously seductive.", profile:['spicy','gourmand'], keyNotes:['vanilla'], vibes:['bold','mysterious'], seasons:['winter'], occasions:['night'], gender:'unisex' },
    { name:"Side Effect", brand:"Initio Parfums", notes:"Tobacco, Vanilla, Rum, Cinnamon.", reason:"A narcotic wood-and-spice blend. Intensely powerful and undeniably attractive.", profile:['spicy','arabic'], keyNotes:['vanilla','oud'], vibes:['bold','mysterious'], seasons:['winter'], occasions:['night'], gender:'unisex' },
    { name:"1 Million", brand:"Paco Rabanne", notes:"Blood Mandarin, Mint, Cinnamon, Rose, Spicy Notes, Amber, Leather, Patchouli.", reason:"Outrageously charismatic. Turns heads in every room it enters.", profile:['spicy'], keyNotes:['citrus','vanilla'], vibes:['bold'], seasons:['winter','all'], occasions:['night'], gender:'men' },
    { name:"Spicebomb Extreme", brand:"Viktor & Rolf", notes:"Grapefruit, Tobacco, Saffron, Black Amber, Vetiver.", reason:"Bold and rich. An aromatic nuclear warhead of spice and warmth.", profile:['spicy'], keyNotes:['vanilla','musk'], vibes:['bold','mysterious'], seasons:['winter'], occasions:['night'], gender:'men' },
    { name:"Black Opium", brand:"YSL", notes:"Pink Pepper, Orange Blossom, Coffee, Jasmine, Bitter Almond, Vanilla.", reason:"Electric, addictive, and perfect for the night. Coffee and white flowers in harmony.", profile:['spicy','gourmand'], keyNotes:['vanilla','rose'], vibes:['bold','mysterious'], seasons:['winter','all'], occasions:['night'], gender:'women' },
    { name:"Hypnôtic Poison", brand:"Dior", notes:"Redwood, Apricot Juice, Tuberose, Jasmine, Almond, Musk.", reason:"Dark, sweet, and hypnotically feminine. An irresistible nocturnal presence.", profile:['spicy','floral'], keyNotes:['vanilla','rose'], vibes:['mysterious','romantic'], seasons:['winter'], occasions:['night'], gender:'women' },
    { name:"Versace Dylan Blue", brand:"Versace", notes:"Grapefruit, Fig Leaf, Aquatic Accord, Patchouli, Incense, Tonka Bean.", reason:"Bold aquatic freshness with depth. Versatile and easy to wear.", profile:['spicy','fresh'], keyNotes:['citrus','musk'], vibes:['bold','elegant'], seasons:['all'], occasions:['daily','night'], gender:'men' },
    { name:"The One by Dolce & Gabbana", brand:"Dolce & Gabbana", notes:"Grapefruit, Coriander, Cardamom, Ginger, Amber, Tobacco, Cedar.", reason:"Warm, smooth, and spicy. A timeless masculine oriental-spicy classic.", profile:['spicy','arabic'], keyNotes:['vanilla','musk'], vibes:['elegant','mysterious'], seasons:['winter','all'], occasions:['night'], gender:'men' },
    { name:"Phantom", brand:"Paco Rabanne", notes:"Lemon, Lavender, Vetiver, Vanilla, Woody Notes.", reason:"Futuristic and playful, but genuinely wearable. Fresh-spicy innovation.", profile:['spicy','fresh'], keyNotes:['citrus','vanilla'], vibes:['bold'], seasons:['all'], occasions:['daily','night'], gender:'men' },
    { name:"Azzaro Wanted by Night", brand:"Azzaro", notes:"Rum, Cardamom, Cinnamon, Cedarwood, Vanilla, Tobacco.", reason:"Dark, smoky, and alluring. The seductive side of the Wanted collection.", profile:['spicy'], keyNotes:['vanilla','musk'], vibes:['bold','mysterious'], seasons:['winter'], occasions:['night'], gender:'men' },
    { name:"Tom Ford Noir Extreme", brand:"Tom Ford", notes:"Cardamom, Vanilla, Neroli, Rose, Sandalwood, Amber.", reason:"Rich, opulent, and seductive. Sweet spice wrapped in dark luxury.", profile:['spicy','arabic'], keyNotes:['vanilla','rose'], vibes:['mysterious','elegant'], seasons:['winter'], occasions:['night'], gender:'men' },
    { name:"Guerlain Shalimar", brand:"Guerlain", notes:"Bergamot, Lemon, Iris, Jasmine, Rose, Vanilla, Tonka Bean, Incense.", reason:"The first oriental fragrance masterpiece. A century of timeless seduction.", profile:['spicy','arabic'], keyNotes:['vanilla','rose'], vibes:['elegant','mysterious'], seasons:['winter','all'], occasions:['night'], gender:'women' },
    { name:"YSL Opium", brand:"Yves Saint Laurent", notes:"Clove, Pepper, Coriander, Jasmine, Rose, Amber, Sandalwood, Vanilla.", reason:"The most scandalous oriental launch in history. Still utterly mesmerizing.", profile:['spicy'], keyNotes:['vanilla','rose'], vibes:['bold','mysterious'], seasons:['winter'], occasions:['night'], gender:'women' },
    { name:"JPG Scandal", brand:"Jean Paul Gaultier", notes:"Honey, Gardenia, Blood Orange, White Musk, Caramel.", reason:"Outrageously sexy and sweet. Designed for women who don't play by the rules.", profile:['spicy','gourmand'], keyNotes:['vanilla'], vibes:['bold'], seasons:['winter','all'], occasions:['night'], gender:'women' },
    { name:"Rabanne 1 Million Lucky", brand:"Paco Rabanne", notes:"Plum, Hazelnut, Clary Sage, Patchouli, Leather.", reason:"Smoother and more playful than the original. Great for nights out.", profile:['spicy'], keyNotes:['vanilla','musk'], vibes:['bold'], seasons:['winter','all'], occasions:['night'], gender:'men' },

    // ─── ARABIC / ORIENTAL ────────────────────────────────────────────────
    { name:"Baccarat Rouge 540", brand:"Maison Francis Kurkdjian", notes:"Saffron, Jasmine, Amberwood, Ambergris, Fir Resin, Cedar.", reason:"The benchmark for modern luxury. Its trail is truly unforgettable.", profile:['arabic','floral'], keyNotes:['oud','musk'], vibes:['mysterious','elegant'], seasons:['all'], occasions:['night','daily'], gender:'unisex' },
    { name:"Tobacco Vanille", brand:"Tom Ford", notes:"Tobacco Leaf, Vanilla, Cacao, Tonka Bean, Dried Fruits, Spice.", reason:"Opulent and deeply warming. The definitive cold-weather statement fragrance.", profile:['arabic','spicy','gourmand'], keyNotes:['vanilla','oud'], vibes:['bold','mysterious'], seasons:['winter'], occasions:['night'], gender:'unisex' },
    { name:"Ambre Nuit", brand:"Dior", notes:"Rose, Bergamot, Labdanum, Amberwood, Musk.", reason:"Warm, enveloping, and romantic. An embrace of amber and rose.", profile:['arabic','floral'], keyNotes:['rose','oud'], vibes:['romantic','mysterious'], seasons:['winter','all'], occasions:['night'], gender:'unisex' },
    { name:"Kilian Love Don't Be Shy", brand:"Kilian Paris", notes:"Neroli, Iris, Marshmallow, Vanilla, Rose, Musk.", reason:"Sweet, sensual, and absolutely lovable. Marshmallow-soft with real depth.", profile:['arabic','gourmand'], keyNotes:['vanilla','rose'], vibes:['romantic'], seasons:['all'], occasions:['night','daily'], gender:'women' },
    { name:"Oud for Greatness", brand:"Initio Parfums", notes:"Oud, Saffron, Juniper, Cashmeran, Musk.", reason:"Commanding and smoky. Pure niche oud power for those who demand presence.", profile:['arabic'], keyNotes:['oud'], vibes:['bold','mysterious'], seasons:['winter','all'], occasions:['night'], gender:'unisex' },
    { name:"Swiss Arabian Shaghaf Oud", brand:"Swiss Arabian", notes:"Rose, Oud, Saffron, Musk, Sandalwood.", reason:"An affordable masterpiece of Arabian perfumery. Rose and oud in perfect balance.", profile:['arabic'], keyNotes:['oud','rose'], vibes:['romantic','mysterious'], seasons:['winter','all'], occasions:['night','daily'], gender:'unisex' },
    { name:"Lattafa Raghba", brand:"Lattafa", notes:"Oud, Vanilla, Coconut, Sweet Wood, Musk.", reason:"Rich and sweet oriental. One of the best affordable oud-style fragrances.", profile:['arabic','gourmand'], keyNotes:['oud','vanilla'], vibes:['romantic','bold'], seasons:['winter','all'], occasions:['night'], gender:'unisex' },
    { name:"Al Haramain L'Aventure", brand:"Al Haramain", notes:"Oud, Musk, Citrus, Amber.", reason:"A beloved Arabic take on the fresh-oud genre. Long lasting and distinctive.", profile:['arabic','fresh'], keyNotes:['oud','citrus'], vibes:['bold'], seasons:['all'], occasions:['daily','night'], gender:'men' },
    { name:"Rasasi La Yuqawam", brand:"Rasasi", notes:"Rose, Oud, Musk, Amber, Sandalwood.", reason:"A true Arabian bouquet. Rich, complex, and deeply satisfying.", profile:['arabic','floral'], keyNotes:['oud','rose'], vibes:['elegant','mysterious'], seasons:['winter','all'], occasions:['night'], gender:'unisex' },
    { name:"Armaf Club de Nuit Intense Man", brand:"Armaf", notes:"Lemon, Black Currant, Pineapple, Bergamot, Birch, Jasmine, Rose, Musk, Ambergris.", reason:"The best Aventus dupe — many say it rivals the original at a fraction of the price.", profile:['arabic','woody'], keyNotes:['musk','citrus'], vibes:['bold','elegant'], seasons:['all'], occasions:['daily','night'], gender:'men' },
    { name:"Penhaligon's Halfeti", brand:"Penhaligon's", notes:"Rose, Oud, Sandalwood, Amber, Saffron.", reason:"Named for the most beautiful village in Turkey. Dark, romantic oud rose.", profile:['arabic','floral'], keyNotes:['oud','rose'], vibes:['romantic','mysterious'], seasons:['winter','all'], occasions:['night'], gender:'unisex' },
    { name:"Nishane Hacivat", brand:"Nishane", notes:"Pineapple, Bergamot, Vetiver, Cedar, Oud, Patchouli.", reason:"Niche excellence — a smoky, complex oud with enormous projection.", profile:['arabic','woody'], keyNotes:['oud','musk'], vibes:['mysterious','bold'], seasons:['winter','all'], occasions:['night'], gender:'unisex' },
    { name:"Maison Crivelli Oud Suprême", brand:"Maison Crivelli", notes:"Oud, Rose, Saffron, Amber, Patchouli.", reason:"A masterfully crafted European oud. Rich but refined. For the truly discerning.", profile:['arabic'], keyNotes:['oud','rose'], vibes:['elegant','mysterious'], seasons:['winter'], occasions:['night'], gender:'unisex' },
    { name:"Kilian Angels' Share", brand:"Kilian Paris", notes:"Cognac, Cinnamon, Clove, Oak, Vanilla, Tonka Bean.", reason:"Like sipping aged cognac by a fireplace. Rich, boozy, and genuinely cozy.", profile:['arabic','gourmand'], keyNotes:['vanilla','oud'], vibes:['romantic','mysterious'], seasons:['winter'], occasions:['night'], gender:'unisex' },
    { name:"Memo Irish Leather", brand:"Memo Paris", notes:"Juniper Berry, Sage, Violet, Iris, Leather, Sandalwood, Atlas Cedarwood.", reason:"Rainy Irish countryside meets luxury leather. Moody, distinctive, unforgettable.", profile:['arabic','woody'], keyNotes:['oud','musk'], vibes:['mysterious','bold'], seasons:['winter','all'], occasions:['night'], gender:'unisex' },
    { name:"Roja Parfums Elysium", brand:"Roja Parfums", notes:"Bergamot, Grapefruit, Lemon, Geranium, Vetiver, Sandalwood, Amber.", reason:"Ultra-luxury freshness for men. The finest fresh-aromatic money can buy.", profile:['arabic','fresh'], keyNotes:['citrus','musk'], vibes:['elegant'], seasons:['all'], occasions:['daily','night'], gender:'men' },
    { name:"Bond No.9 New York Nights", brand:"Bond No.9", notes:"Apple, Raspberry, Jasmine, Sandalwood, Cedarwood, Musk.", reason:"The energy of New York nightlife captured in a bottle. Vibrant and seductive.", profile:['arabic','floral'], keyNotes:['musk','rose'], vibes:['bold'], seasons:['all'], occasions:['night'], gender:'unisex' },

    // ─── GOURMAND ─────────────────────────────────────────────────────────
    { name:"Alien", brand:"Thierry Mugler", notes:"Cashmeran, White Flowers Accord, Jasmine Sambac, Woody Amber.", reason:"Otherworldly, warm, and impossible to ignore. A 21st century cult classic.", profile:['gourmand','floral'], keyNotes:['vanilla','musk'], vibes:['mysterious','bold'], seasons:['winter'], occasions:['night'], gender:'women' },
    { name:"Angel", brand:"Thierry Mugler", notes:"Bergamot, Honeysuckle, Dewberry, Honey, Chocolate, Patchouli.", reason:"The original gourmand. A love-it-or-hate-it icon that defined a genre.", profile:['gourmand'], keyNotes:['vanilla'], vibes:['bold','mysterious'], seasons:['winter'], occasions:['night'], gender:'women' },
    { name:"Kayali Vanilla 28", brand:"Kayali", notes:"Vanilla Orchid, Tonka Absolute, Amberwood, Brown Sugar, Musk.", reason:"Warm vanilla done right — rich, layered, and comforting.", profile:['gourmand'], keyNotes:['vanilla','musk'], vibes:['romantic'], seasons:['winter','all'], occasions:['daily','night'], gender:'women' },
    { name:"Prada Candy EDP", brand:"Prada", notes:"Caramel, Musk, Benzoin, White Musks.", reason:"Sweet, elegant, entirely addictive. Prada candy-coated luxury.", profile:['gourmand'], keyNotes:['vanilla','musk'], vibes:['romantic','bold'], seasons:['winter','all'], occasions:['night'], gender:'women' },
    { name:"Juliette Has a Gun Not a Perfume", brand:"Juliette Has a Gun", notes:"Ambroxan (single note).", reason:"The most revolutionary minimalist fragrance. Smells different on everyone's skin.", profile:['gourmand','fresh'], keyNotes:['musk'], vibes:['mysterious','elegant'], seasons:['all'], occasions:['daily'], gender:'unisex' },
    { name:"Byredo Bibliothèque", brand:"Byredo", notes:"Peach, Plum, Violet, Vetiver, Vanilla, Birchwood.", reason:"The smell of old books and leather. For intellectuals and quiet romantics.", profile:['gourmand','woody'], keyNotes:['vanilla','musk'], vibes:['mysterious','romantic'], seasons:['winter','all'], occasions:['daily'], gender:'unisex' },
    { name:"Montale Intense Café", brand:"Montale", notes:"Coffee, Rose, Musk, Vanilla, Patchouli.", reason:"Coffee and rose — an intoxicating combination you won't forget.", profile:['gourmand','floral'], keyNotes:['vanilla','rose'], vibes:['romantic','mysterious'], seasons:['winter','all'], occasions:['night','daily'], gender:'unisex' },
    { name:"Maison Margiela Replica Jazz Club", brand:"Maison Margiela", notes:"Rum, Musician's Accords, Vetiver, Woodsy Notes, Musk.", reason:"Late-night jazz bar — smoky, boozy, warm. A sensory experience.", profile:['gourmand','woody'], keyNotes:['vanilla','musk'], vibes:['mysterious','romantic'], seasons:['winter','all'], occasions:['night'], gender:'unisex' },
    { name:"Chanel Chance Eau Tendre", brand:"Chanel", notes:"Grapefruit, Quince, Jasmine, White Musk, Cedar.", reason:"Soft, youthful, and radiant. A playful feminine take on the iconic Chance line.", profile:['gourmand','floral'], keyNotes:['vanilla','citrus'], vibes:['romantic','elegant'], seasons:['all'], occasions:['daily'], gender:'women' },
    { name:"Commodity Gold", brand:"Commodity", notes:"Sandalwood, Vanilla, Musk.", reason:"Skin-like warmth and understated luxury. Addictively simple.", profile:['gourmand'], keyNotes:['vanilla','musk'], vibes:['elegant','romantic'], seasons:['all'], occasions:['daily'], gender:'unisex' },
    { name:"Maison Margiela Replica By the Fireplace", brand:"Maison Margiela", notes:"Chestnut, Guaiac Wood, Cashmeran, Vanilla, Musk.", reason:"Sitting beside a real fireplace in winter. Warm, smoky, cozy, beautiful.", profile:['gourmand','spicy'], keyNotes:['vanilla','musk'], vibes:['romantic','mysterious'], seasons:['winter'], occasions:['night','daily'], gender:'unisex' },
    { name:"Viktor & Rolf Spicebomb Nightvision", brand:"Viktor & Rolf", notes:"Lavender, Apple, Vetiver, White Musks.", reason:"Fresh and adventurous. The cool counterpart to the spicy original.", profile:['gourmand','fresh'], keyNotes:['musk','citrus'], vibes:['bold'], seasons:['all'], occasions:['night','daily'], gender:'men' },

    // ─── NICHE / UNISEX ───────────────────────────────────────────────────
    { name:"Santal 33", brand:"Le Labo", notes:"Cardamom, Iris, Violet, Ambrette Seeds, Cedarwood, Sandalwood, Papyrus.", reason:"The cult New York sandalwood. Skin-intimate and profoundly appealing on everyone.", profile:['woody'], keyNotes:['musk','vanilla'], vibes:['elegant','mysterious','romantic'], seasons:['all'], occasions:['daily'], gender:'unisex' },
    { name:"Another 13", brand:"Le Labo", notes:"Ambroxan, Moss, Ambrette Seeds, Jasmine.", reason:"Sensuous and skin-like. One of the most addictive signature scents ever made.", profile:['floral','woody'], keyNotes:['musk'], vibes:['mysterious','romantic'], seasons:['all'], occasions:['daily'], gender:'unisex' },
    { name:"Orto Parisi Megamare", brand:"Orto Parisi", notes:"Seaweed, Lichen, Marine Accord, Ambroxan.", reason:"Raw and wild — like swimming in the open ocean at night. Fearlessly aquatic.", profile:['fresh'], keyNotes:['musk'], vibes:['bold','mysterious'], seasons:['summer'], occasions:['sporty'], gender:'unisex' },
    { name:"Fragrance Du Bois Oud Rose Intense", brand:"Fragrance Du Bois", notes:"Oud, Rose, Amber, Sandalwood.", reason:"Rare oud-rose luxury. For those who want the very best of Arabian and French perfumery.", profile:['arabic','floral'], keyNotes:['oud','rose'], vibes:['elegant','romantic'], seasons:['winter','all'], occasions:['night'], gender:'unisex' },
    { name:"Serge Lutens Ambre Sultan", brand:"Serge Lutens", notes:"Oregano, Coriander, Bay Laurel, Cistus, Amber, Benzoin, Sandalwood, Vanilla.", reason:"One of the greatest amber fragrances ever made. Dense, golden, and resinous.", profile:['arabic','gourmand'], keyNotes:['vanilla','oud'], vibes:['mysterious'], seasons:['winter'], occasions:['night'], gender:'unisex' },
    { name:"Floral Street Wonderland Peony", brand:"Floral Street", notes:"Peony, Pink Grapefruit, Sandalwood.", reason:"Clean-green feminine. Sustainably made, beautifully fresh and floral.", profile:['floral','fresh'], keyNotes:['rose','citrus'], vibes:['romantic'], seasons:['summer','all'], occasions:['daily'], gender:'women' },
    { name:"Replica Flower Market", brand:"Maison Margiela", notes:"Jasmine, Violet, Lily of the Valley, Sandalwood, Musk.", reason:"A fresh-cut flower bouquet. Clean, bright, and happy.", profile:['floral','fresh'], keyNotes:['rose','musk'], vibes:['romantic'], seasons:['summer','all'], occasions:['daily'], gender:'unisex' },
    { name:"Escentric Molecules Molecule 01", brand:"Escentric Molecules", notes:"Iso E Super (single molecule).", reason:"Eerily skin-like. Draws people close without them knowing why. A stealthy icon.", profile:['woody'], keyNotes:['musk'], vibes:['mysterious'], seasons:['all'], occasions:['daily'], gender:'unisex' },
];

const PerfumeHubAI = () => {
    const { products } = useContext(ShopContext);
    const [step, setStep] = useState(0); // 0: Start, 1..N: Questions, Loading, Results
    const [isExpertMode, setIsExpertMode] = useState(false);
    const [answers, setAnswers] = useState({
        gender: '',
        profile: '',
        occasion: '',
        vibe: '',
        note: '',
        season: '',
        level: ''
    });
    const [recommendations, setRecommendations] = useState([]);
    const [externalRecs, setExternalRecs] = useState([]);

    const currentQuestions = isExpertMode ? QUESTIONS : QUESTIONS.filter(q => !q.expertOnly);

    const handleAnswer = (questionId, optionId) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleNext = () => {
        if (step < currentQuestions.length) {
            setStep(step + 1);
        } else {
            setStep(10); // Loading state
            findRecommendations();
        }
    };

    const findRecommendations = () => {
        setStep(10); // Ensure loading is visible

        setTimeout(() => {
            // ── In-store matching (multi-dimensional weighted scorer) ─
            const inStore = products
                .map(p => {
                    let score = 0;
                    const genderMatch = answers.gender === 'unisex' || p.gender === answers.gender || p.gender === 'unisex';
                    if (!genderMatch) return null;

                    if (p.category && p.category.includes(answers.profile)) score += 5;
                    if (isExpertMode) {
                        if (p.notes && p.notes.some(n => n.toLowerCase().includes(answers.note))) score += 4;
                        if (p.vibes && p.vibes.includes(answers.vibe)) score += 3;
                    }
                    if (p.occasions && p.occasions.includes(answers.occasion)) score += 2;

                    const threshold = isExpertMode ? 4 : 3;
                    return score >= threshold ? { product: p, score } : null;
                })
                .filter(Boolean)
                .sort((a, b) => b.score - a.score)
                .map(x => x.product);

            setRecommendations(inStore.slice(0, 3));

            // ── Online / external matching (weighted scoring) ─────────
            const scored = EXTERNAL_DATABASE
                .map(e => {
                    let score = 0;
                    const genderOk = answers.gender === 'unisex' || e.gender === answers.gender || e.gender === 'unisex';
                    if (!genderOk) return null;

                    if (e.profile.includes(answers.profile)) score += 5;
                    if (isExpertMode) {
                        if (e.keyNotes.includes(answers.note)) score += 4;
                        if (e.vibes.includes(answers.vibe)) score += 3;
                        if (answers.season === 'all' || e.seasons.includes(answers.season) || e.seasons.includes('all')) score += 2;
                    }
                    if (e.occasions.includes(answers.occasion)) score += 2;

                    return score >= 5 ? { entry: e, score } : null;
                })
                .filter(Boolean)
                .sort((a, b) => b.score - a.score);

            const topExternal = scored.map(x => x.entry).slice(0, 4);

            if (topExternal.length === 0) {
                const fallback = EXTERNAL_DATABASE
                    .filter(e => answers.gender === 'unisex' || e.gender === answers.gender || e.gender === 'unisex')
                    .slice(0, 3);
                setExternalRecs(fallback);
            } else {
                setExternalRecs(topExternal);
            }

            setStep(11); // Results state
        }, 2000);
    };

    const resetQuiz = () => {
        setStep(0);
        setIsExpertMode(false);
        setAnswers({ gender: '', profile: '', occasion: '', vibe: '', note: '', season: '', level: '' });
    };

    const startExpertMode = () => {
        setIsExpertMode(true);
        setStep(1);
    };

    return (
        <div className="ai-advisor-container">
            <div className="scent-aura-bg">
                {/* Shimmering Beams */}
                <div className="shimmer-beam" style={{ animationDelay: '0s' }}></div>
                <div className="shimmer-beam" style={{ animationDelay: '-7s', opacity: 0.5 }}></div>

                {/* Aura Bloom Particles (Slow Gradients) */}
                <div className="aura-particle" style={{ '--x': '150px', '--y': '100px', '--duration': '15s', top: '5%', left: '10%', width: '500px', height: '500px' }}></div>
                <div className="aura-particle" style={{ '--x': '-100px', '--y': '150px', '--duration': '20s', bottom: '10%', right: '5%', width: '600px', height: '600px' }}></div>
                
                {/* Twinkling Gold Dust */}
                {React.useMemo(() => [...Array(20)].map((_, i) => (
                    <div 
                        key={i} 
                        className="gold-dust" 
                        style={{ 
                            top: `${Math.random() * 100}%`, 
                            left: `${Math.random() * 100}%`,
                            '--duration': `${5 + Math.random() * 10}s`,
                            '--delay': `-${Math.random() * 10}s`
                        }}
                    ></div>
                )), [])}
            </div>
            
            <div className="ai-header" style={{ position: 'relative', zIndex: 2 }}>
                <Sparkles className="shine-icon" size={48} color="#d4af37" />
                <h1>Scent Genie</h1>
                <p>Let our intelligence curate your signature scent. Perfect for gifts or personal discovery.</p>
            </div>

            {step === 0 && (
                <div className="quiz-card start-card">
                    <div className="expert-badge">NEW: EXPERT MODE</div>
                    <h2>Find Your Perfect Match</h2>
                    <p>Discover fragrances tailored specifically to your personality and style.</p>
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '30px', flexWrap: 'wrap' }}>
                        <button className="btn-secondary" onClick={() => setStep(1)}>
                            Discovery Mode
                        </button>
                        <button className="btn-primary" onClick={startExpertMode}>
                            Expert Mode <Sparkles size={16} />
                        </button>
                    </div>
                </div>
            )}

            {step >= 1 && step <= currentQuestions.length && (
                <div className="quiz-card">
                    <div className="quiz-progress" style={{ width: `${(step / currentQuestions.length) * 100}%` }}></div>
                    <div className="question-section">
                        <div className="step-count">Question {step} of {currentQuestions.length}</div>
                        <h2>{currentQuestions[step - 1].title}</h2>
                        <div className="options-grid">
                            {currentQuestions[step - 1].options.map(option => (
                                <button
                                    key={option.id}
                                    className={`option-btn ${answers[currentQuestions[step - 1].id] === option.id ? 'selected' : ''}`}
                                    onClick={() => handleAnswer(currentQuestions[step - 1].id, option.id)}
                                >
                                    <div className="option-icon">
                                        {option.icon}
                                    </div>
                                    <span className="option-label">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="quiz-nav">
                        <button className="btn-secondary" onClick={() => (step === 1 ? setStep(0) : setStep(step - 1))}>
                            <ArrowLeft size={18} style={{ marginRight: '8px' }} /> Back
                        </button>
                        {answers[currentQuestions[step - 1].id] && (
                            <button className="btn-primary" onClick={handleNext}>
                                {step === currentQuestions.length ? 'Find My Scent' : 'Next'} <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {step === 10 && (
                <div className="quiz-card loading-container">
                    <div className="loader"></div>
                    <h3>{isExpertMode ? 'Scent Genie Expert Analysis...' : 'Consulting the Scent Genie...'}</h3>
                    <p>Analyzing high-level scent data and matching your personality profile.</p>
                </div>
            )}

            {step === 11 && (
                <div className="results-section">
                    <div className="results-title">
                        <h2>Your Personal Curation</h2>
                        <p>Based on your {isExpertMode ? 'expert analysis' : 'discovery'}, we recommend these masterpieces.</p>
                    </div>

                    {recommendations.length > 0 && (
                        <div className="store-recommendations">
                            <h3 className="section-subtitle">AVAILABLE IN STORE</h3>
                            <div className="recommendation-grid">
                                {recommendations.map(product => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="external-recs v2">
                        <h3><ShoppingBag size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} /> Global Expert Picks</h3>
                        <p style={{ textAlign: 'center', marginBottom: '30px', color: '#888' }}>
                            {recommendations.length > 0
                                ? 'Complementary world-class fragrances to explore.'
                                : 'We didn\'t find an exact match in our store that meets our quality standard for your profile. These global icons are your best match:'}
                        </p>
                        <div className="expert-recs-list">
                            {externalRecs.map((rec, index) => (
                                <div key={index} className="expert-item-card reveal active">
                                    <div className="expert-item-details">
                                        <div className="expert-item-brand-label">{rec.brand}</div>
                                        <h4>{rec.name}</h4>
                                        <div className="expert-item-type">{rec.type || (rec.profile && rec.profile[0]?.toUpperCase()) || 'EXCLUSIVE'}</div>
                                        <p className="expert-item-notes"><strong>Notes:</strong> {rec.notes}</p>
                                        <div className="expert-item-reason">{rec.reason}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '50px' }}>
                        <button className="btn-secondary" onClick={resetQuiz}>
                            <RefreshCw size={18} style={{ marginRight: '8px' }} /> Start Over
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerfumeHubAI;

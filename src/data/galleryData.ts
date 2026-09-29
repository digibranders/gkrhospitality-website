export interface GalleryItem {
  id: number;
  title: string;
  description: string;
  link: string;
  images: string[];
  /** Intrinsic size of images[0]. Lets next/image reserve space and avoid layout shift. */
  coverWidth: number;
  coverHeight: number;
}

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    "id": 1,
    "title": "BLACE",
    "description": "Gallery for Blace",
    "link": "https://www.blace.com/",
    "images": [
      "/images/gallery/BLACE Entertainment/Blace 1.jpg",
      "/images/gallery/BLACE Entertainment/Blace 2.jpg",
      "/images/gallery/BLACE Entertainment/Blace 3.jpg"
    ],
    "coverWidth": 2160,
    "coverHeight": 1440
  },
  {
    "id": 2,
    "title": "BXP",
    "description": "Gallery for Bxp ",
    "link": "https://www.bxp.com/",
    "images": [
      "/images/gallery/BXP Residential and CRE Amenities/BXP 1.jpg",
      "/images/gallery/BXP Residential and CRE Amenities/BXP 2.png",
      "/images/gallery/BXP Residential and CRE Amenities/BXP_3.jpg"
    ],
    "coverWidth": 2064,
    "coverHeight": 1728
  },
  {
    "id": 3,
    "title": "THE BEVERLY HILTON",
    "description": "Gallery for The Beverly Hilton",
    "link": "https://www.hilton.com/en/hotels/laxbhhh-the-beverly-hilton/events/",
    "images": [
      "/images/gallery/Beverly Hilton/Beverly_1.jpg",
      "/images/gallery/Beverly Hilton/Beverly_2.jpg",
      "/images/gallery/Beverly Hilton/The Beverly Hilton.jpg"
    ],
    "coverWidth": 1920,
    "coverHeight": 1281
  },
  {
    "id": 4,
    "title": "ZUMA NEW YORK",
    "description": "Gallery for Zuma New York",
    "link": "https://www.zumarestaurant.com/",
    "images": [
      "/images/gallery/Zuma New York Restaurants/zuma_1.jpg",
      "/images/gallery/Zuma New York Restaurants/zuma_2.png",
      "/images/gallery/Zuma New York Restaurants/zuma_3.jpg"
    ],
    "coverWidth": 2400,
    "coverHeight": 1645
  },
  {
    "id": 5,
    "title": "EQUINOX HOTELS",
    "description": "Gallery for Equinox Hotels",
    "link": "https://www.equinox-hotels.com/",
    "images": [
      "/images/gallery/EQUINOX HOTELS/EQUINOX HOTELS 2.jpg",
      "/images/gallery/EQUINOX HOTELS/Equionix_2.jpg",
      "/images/gallery/EQUINOX HOTELS/Equinox_3.jpg"
    ],
    "coverWidth": 1536,
    "coverHeight": 1920
  },
  {
    "id": 6,
    "title": "ADARE",
    "description": "Gallery for Adare",
    "link": "https://www.adaremanor.com/",
    "images": [
      "/images/gallery/adare-hotels/adare_1.jpg",
      "/images/gallery/adare-hotels/adare_2.jpg",
      "/images/gallery/adare-hotels/Adare_3new.jpg"
    ],
    "coverWidth": 1072,
    "coverHeight": 1072
  },
  // {
  //   "id": 7,
  //   "title": "Hilton Hotels Corporation",
  //   "description": "Gallery for Hilton Hotels Corporation",
  //   "link": "#",
  //   "images": [
  //     "/images/gallery/Hilton Hotels Corporation/Hilton Hotel 3.png",
  //     "/images/gallery/Hilton Hotels Corporation/Hilton Hotel.jpg",
  //     "/images/gallery/Hilton Hotels Corporation/Hilton_Hotel_2.png"
  //   ]
  // },
  {
    "id": 8,
    "title": "CONVENE | etc.venues",
    "description": "Gallery for CONVENE | etc.venues",
    "link": "https://convene.com/about-us/etc-venues/",
    "images": [
      "/images/gallery/etc.venues meetings and events/etc_1.jpg",
      "/images/gallery/etc.venues meetings and events/etc_2.jpg",
      "/images/gallery/etc.venues meetings and events/etc_3.jpg"
    ],
    "coverWidth": 1600,
    "coverHeight": 1000
  },
  {
    "id": 9,
    "title": "MONTAUK DISTILLING CO",
    "description": "Gallery for Montauk Distilling Co",
    "link": "https://www.montaukdistillingco.com/",
    "images": [
      "/images/gallery/Montauk Distilling Co Restaurants and Bar/Montauk Distilling Co. 1.jpg",
      "/images/gallery/Montauk Distilling Co Restaurants and Bar/Montauk Distilling Co. 2.jpg",
      "/images/gallery/Montauk Distilling Co Restaurants and Bar/Montauk-Distilling-3.jpg"
    ],
    "coverWidth": 1200,
    "coverHeight": 900
  },
  {
    "id": 10,
    "title": "PRINCIPAL HOTELS",
    "description": "Gallery for Principal Hotels",
    "link": "#",
    "images": [
      "/images/gallery/Principal Hotels/Principal Hotels_2.png",
      "/images/gallery/Principal Hotels/Prinicipal_2.jpg",
      "/images/gallery/Principal Hotels/Prinicipal_3.jpg"
    ],
    "coverWidth": 500,
    "coverHeight": 350
  },
  {
    "id": 11,
    "title": "RUDIN GROUP",
    "description": "Gallery for Rudin Group",
    "link": "https://www.rudin.com/",
    "images": [
      "/images/gallery/Rudin Group Residential and CRE Amenities/Rudin_2.jpg",
      "/images/gallery/Rudin Group Residential and CRE Amenities/Rudin 1.png",
      "/images/gallery/Rudin Group Residential and CRE Amenities/Rudin_3.jpg"
    ],
    "coverWidth": 1920,
    "coverHeight": 1267
  },
  {
    "id": 12,
    "title": "STARR RESTAURANTS",
    "description": "Gallery for Starr Restaurants",
    "link": "https://www.starr-restaurants.com/",
    "images": [
      "/images/gallery/STARR Restaurants/Starr_1.jpg",
      "/images/gallery/STARR Restaurants/Starr_2.jpg",
      "/images/gallery/STARR Restaurants/Starr_3.jpg"
    ],
    "coverWidth": 1080,
    "coverHeight": 810
  },
  {
    "id": 13,
    "title": "SAGE HOSPITALITY",
    "description": "Gallery for Sage Hospitality",
    "link": "https://sagerealty.com/",
    "images": [
      "/images/gallery/Sage Hospitality Residential and CRE Amenities/sage_1.jpg",
      "/images/gallery/Sage Hospitality Residential and CRE Amenities/sage_2.jpg",
      "/images/gallery/Sage Hospitality Residential and CRE Amenities/sage_3.jpg"
    ],
    "coverWidth": 763,
    "coverHeight": 489
  },
  {
    "id": 14,
    "title": "WALDORF ASTORIA NEW YORK",
    "description": "Gallery for Waldorf Astoria New York",
    "link": "https://www.waldorfastorianewyork.com/",
    "images": [
      "/images/gallery/Waldorf Astoria New York Hotels/Waldorf Astoria New York 2.jpg",
      "/images/gallery/Waldorf Astoria New York Hotels/waldrof_2.jpg",
      "/images/gallery/Waldorf Astoria New York Hotels/waldrof_3.jpg"
    ],
    "coverWidth": 1000,
    "coverHeight": 600
  },
  {
    "id": 15,
    "title": "BOSTON HARBOR",
    "description": "Gallery for Boston Harbor",
    "link": "https://www.bostonharborhotel.com/",
    "images": [
      "/images/gallery/Boston Harbor Hotel/Boston Harbor 2.png",
      "/images/gallery/Boston Harbor Hotel/Boston Harbor 3.jpg",
      "/images/gallery/Boston Harbor Hotel/Boston Harbor.jpg"
    ],
    "coverWidth": 500,
    "coverHeight": 500
  },
  {
    "id": 16,
    "title": "FAIRFIELD BEACH CLUB",
    "description": "Gallery for Fairfield Beach Club",
    "link": "https://www.fbc.club/",
    "images": [
      "/images/gallery/FBC Private and Member-only/SaveClip.App_455806974_737759325100612_7556852630658393511_n.jpg",
      "/images/gallery/FBC Private and Member-only/SaveClip.App_455877427_1155219119098693_8402729839714548611_n.jpg",
      "/images/gallery/FBC Private and Member-only/SaveClip.App_456197073_994329485776863_3726931994884086630_n.jpg"
    ],
    "coverWidth": 1080,
    "coverHeight": 1080
  },
  // {
  //   "id": 17,
  //   "title": "Affect Group",
  //   "description": "Gallery for Affect Group",
  //   "link": "#",
  //   "images": [
  //     "/images/gallery/affect-group-residential-amenities/Affect Group 2.jpg",
  //     "/images/gallery/affect-group-residential-amenities/Affect Group 3.jpg",
  //     "/images/gallery/affect-group-residential-amenities/Affect Group.jpg"
  //   ]
  // },
  {
    "id": 18,
    "title": "BAKAN",
    "description": "Gallery for Bakan",
    "link": "https://www.bakanwynwood.com/",
    "images": [
      "/images/gallery/bakan-restaurant/BAKAN 1.webp",
      "/images/gallery/bakan-restaurant/BAKAN 2.webp",
      "/images/gallery/bakan-restaurant/BAKAN 3.webp"
    ],
    "coverWidth": 1100,
    "coverHeight": 732
  },
  // {
  //   "id": 19,
  //   "title": "Convene",
  //   "description": "Gallery for Convene",
  //   "link": "#",
  //   "images": [
  //     "/images/gallery/convene meetings/convene 2.jpg",
  //     "/images/gallery/convene meetings/convene 3.jpg",
  //     "/images/gallery/convene meetings/convene.jpg"
  //   ]
  // },
  {
    "id": 20,
    "title": "MEET RESIDENT",
    "description": "Gallery for Meet Resident",
    "link": "https://www.meetresident.com/",
    "images": [
      "/images/gallery/Meet Resident Private and Members Only/Resident .jpg",
      "/images/gallery/Meet Resident Private and Members Only/Resident 2.jpg",
      "/images/gallery/Meet Resident Private and Members Only/Resident 3.jpg"
    ],
    "coverWidth": 2500,
    "coverHeight": 2000
  },
  {
    "id": 21,
    "title": "Caribbean- St Vincent and the Grenadines",
    "description": "Gallery for Caribbean- St Vincent and the Grenadines",
    "link": "#",
    "images": [
      "/images/gallery/Caribbean St Vincent and the Grenadines/Caribbean_1.jpg",
      "/images/gallery/Caribbean St Vincent and the Grenadines/Caribbean_2.jpg",
      "/images/gallery/Caribbean St Vincent and the Grenadines/Caribbean_3.jpg"
    ],
    "coverWidth": 2048,
    "coverHeight": 1073
  }
];

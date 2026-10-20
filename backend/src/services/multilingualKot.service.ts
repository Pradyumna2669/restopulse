export type SupportedKitchenLanguage = 'en' | 'hi' | 'mr' | 'gu';

export const DISH_TRANSLATIONS: Record<string, Record<SupportedKitchenLanguage, string>> = {
  item_paneer_tikka: {
    en: 'Paneer Tikka Angara',
    hi: 'पनीर टिक्का अंगारा',
    mr: 'पनीर टिक्का अंगारा',
    gu: 'પનીર ટીક્કા અંગારા'
  },
  item_butter_chicken: {
    en: 'Classic Butter Chicken',
    hi: 'बटर चिकन',
    mr: 'बटर चिकन',
    gu: 'બટર ચિકન'
  },
  item_dal_makhani: {
    en: 'Dal Makhani Bukhara',
    hi: 'दाल मखनी',
    mr: 'दाल मखनी',
    gu: 'દાળ મખની'
  },
  item_garlic_naan: {
    en: 'Butter Garlic Naan',
    hi: 'बटर गार्लिक नान',
    mr: 'बटर गार्लिक नान',
    gu: 'બટર ગાર્લિક નાન'
  },
  item_biryani: {
    en: 'Dum Hyderabadi Biryani',
    hi: 'दम हैदराबादी बिरयानी',
    mr: 'दम हैदराबादी बिर्याणी',
    gu: 'દમ હૈદરાબાદી બિરયાની'
  },
  item_gulab_jamun: {
    en: 'Saffron Gulab Jamun',
    hi: 'केसर गुलाब जामुन',
    mr: 'केशर गुलाब जामुन',
    gu: 'કેસર ગુલાબ જાંબુ'
  }
};

export const COMMON_INSTRUCTION_TRANSLATIONS: Record<string, Record<SupportedKitchenLanguage, string>> = {
  'spicy': { en: 'Make Spicy', hi: 'तीखा बनाएं', mr: 'तिखट करा', gu: 'તીખું બનાવો' },
  'extra spicy': { en: 'Extra Spicy', hi: 'ज्यादा तीखा', mr: 'जास्त तिखट', gu: 'વધારે તીખું' },
  'less spicy': { en: 'Less Spicy', hi: 'कम तीखा', mr: 'कमी तिखट', gu: 'ઓછું તીખું' },
  'no onion': { en: 'No Onion', hi: 'बिना प्याज', mr: 'कांदा नाही', gu: 'ડુંગળી વગર' },
  'no garlic': { en: 'No Garlic', hi: 'बिना लहसुन', mr: 'लसूण नाही', gu: 'લસણ વગર' },
  'jain': { en: 'Jain Prep', hi: 'जैन तैयारी', mr: 'जैन पद्धत', gu: 'જૈન તૈયારી' },
  'crispy': { en: 'Extra Crispy', hi: 'कुरकुरा', mr: 'कुरकुरीत', gu: 'કુરકુરી' },
  'less oil': { en: 'Less Oil / Butter', hi: 'कम तेल / मक्खन', mr: 'कमी तेल / बटर', gu: 'ઓછું તેલ / માખણ' }
};

export class MultilingualKotService {
  /**
   * Resolves dish name into requested kitchen language
   */
  public static getLocalizedDishName(menuItemId: string, fallbackName: string, lang: SupportedKitchenLanguage): string {
    if (lang === 'en') return fallbackName;
    const entry = DISH_TRANSLATIONS[menuItemId];
    if (entry && entry[lang]) {
      return `${fallbackName} (${entry[lang]})`;
    }
    return fallbackName;
  }

  /**
   * Resolves kitchen cooking notes into requested language
   */
  public static getLocalizedInstruction(notes: string, lang: SupportedKitchenLanguage): string {
    if (!notes || lang === 'en') return notes;
    const lower = notes.toLowerCase().trim();
    const sortedEntries = Object.entries(COMMON_INSTRUCTION_TRANSLATIONS).sort(
      (a, b) => b[0].length - a[0].length
    );
    for (const [key, trans] of sortedEntries) {
      if (lower.includes(key)) {
        return `${notes} [${trans[lang]}]`;
      }
    }
    return notes;
  }
}

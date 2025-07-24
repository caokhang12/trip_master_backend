import { Injectable, Logger } from '@nestjs/common';

/**
 * Administrative info interface for Vietnamese locations
 */
export interface AdministrativeInfo {
  province?: string;
  district?: string;
  ward?: string;
}

/**
 * Vietnam detection utility class with Vietnamese keyword and character detection
 */
@Injectable()
export class VietnamDetectorUtil {
  private static readonly logger = new Logger(VietnamDetectorUtil.name);

  private static readonly VIETNAMESE_KEYWORDS = [
    // Country names
    'vietnam',
    'việt nam',
    'viet nam',
    'vnm',

    // Major cities and destinations
    'saigon',
    'sài gòn',
    'ho chi minh',
    'hồ chí minh',
    'hcm',
    'tphcm',
    'hanoi',
    'hà nội',
    'ha noi',
    'da nang',
    'đà nẵng',
    'danang',
    'hue',
    'huế',
    'hué',
    'can tho',
    'cần thơ',
    'hai phong',
    'hải phòng',
    'bien hoa',
    'biên hòa',
    'nha trang',
    'vung tau',
    'vũng tàu',
    'da lat',
    'đà lạt',
    'dalat',
    'quy nhon',
    'quy nhơn',
    'long xuyen',
    'long xuyên',
    'thai nguyen',
    'thái nguyên',
    'buon ma thuot',
    'buôn ma thuột',
    'phan thiet',
    'phan thiết',
    'my tho',
    'mỹ tho',
    'rach gia',
    'rạch giá',
    'ca mau',
    'cà mau',
    'soc trang',
    'sóc trăng',
    'vinh',
    'vĩnh',
    'bac lieu',
    'bạc liêu',
    'ha long',
    'hạ long',
    'halong',

    // Tourist destinations and regions
    'mekong',
    'mê kông',
    'đồng bằng sông cửu long',
    'sapa',
    'sa pa',
    'mui ne',
    'mũi né',
    'phu quoc',
    'phú quốc',
    'con dao',
    'côn đảo',
    'hoi an',
    'hội an',

    // Northern provinces
    'ha giang',
    'hà giang',
    'cao bang',
    'cao bằng',
    'dien bien',
    'điện biên',
    'lao cai',
    'lào cai',
    'son la',
    'sơn la',
    'lai chau',
    'lai châu',
    'yen bai',
    'yên bái',
    'tuyen quang',
    'tuyên quang',
    'bac kan',
    'bắc kạn',
    'lang son',
    'lạng sơn',
    'quang ninh',
    'quảng ninh',
    'bac giang',
    'bắc giang',
    'phu tho',
    'phú thọ',
    'vinh phuc',
    'vĩnh phúc',
    'bac ninh',
    'bắc ninh',
    'hai duong',
    'hải dương',
    'hung yen',
    'hưng yên',
    'thai binh',
    'thái bình',
    'ha nam',
    'hà nam',
    'nam dinh',
    'nam định',
    'ninh binh',
    'ninh bình',

    // Central provinces
    'thanh hoa',
    'thanh hóa',
    'nghe an',
    'nghệ an',
    'ha tinh',
    'hà tĩnh',
    'quang binh',
    'quảng bình',
    'quang tri',
    'quảng trị',
    'thua thien hue',
    'thừa thiên huế',
    'quang nam',
    'quảng nam',
    'quang ngai',
    'quảng ngãi',
    'binh dinh',
    'bình định',
    'phu yen',
    'phú yên',
    'khanh hoa',
    'khánh hòa',
    'ninh thuan',
    'ninh thuận',
    'binh thuan',
    'bình thuận',
    'kon tum',
    'gia lai',
    'dak lak',
    'đắk lắk',
    'dak nong',
    'đắk nông',
    'lam dong',
    'lâm đồng',

    // Southern provinces
    'binh phuoc',
    'bình phước',
    'tay ninh',
    'tây ninh',
    'binh duong',
    'bình dương',
    'dong nai',
    'đồng nai',
    'ba ria vung tau',
    'bà rịa vũng tàu',
    'long an',
    'tien giang',
    'tiền giang',
    'ben tre',
    'bến tre',
    'tra vinh',
    'trà vinh',
    'vinh long',
    'vĩnh long',
    'dong thap',
    'đồng tháp',
    'an giang',
    'kien giang',
    'kiên giang',
    'hau giang',
    'hậu giang',
  ];

  /**
   * Vietnamese diacritical character pattern for detection
   */
  private static readonly VIETNAMESE_CHARS =
    /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;

  /**
   * Vietnamese tone patterns for more sophisticated detection
   */
  private static readonly VIETNAMESE_TONE_PATTERNS = [
    /[àáảãạ]/i, // a with tones
    /[ăắằẳẵặ]/i, // ă with tones
    /[âấầẩẫậ]/i, // â with tones
    /[èéẻẽẹ]/i, // e with tones
    /[êếềểễệ]/i, // ê with tones
    /[ìíỉĩị]/i, // i with tones
    /[òóỏõọ]/i, // o with tones
    /[ôốồổỗộ]/i, // ô with tones
    /[ơớờởỡợ]/i, // ơ with tones
    /[ùúủũụ]/i, // u with tones
    /[ưứừửữự]/i, // ư with tones
    /[ỳýỷỹỵ]/i, // y with tones
    /đ/i, // đ character
  ];

  /**
   * Check if a query string is related to Vietnam
   * @param query - The search query to analyze
   * @param userCountry - Optional user country code for context
   * @returns boolean indicating if the query is Vietnam-related
   */
  static isVietnameseQuery(query: string, userCountry?: string): boolean {
    this.logger.debug(`Analyzing query for Vietnamese content: "${query}"`);

    // Check user country first (strongest signal)
    if (userCountry === 'VN' || userCountry === 'vn') {
      this.logger.debug('User country is Vietnam - returning true');
      return true;
    }

    if (!query || typeof query !== 'string') {
      return false;
    }

    const lowerQuery = query.toLowerCase().trim();

    // Check for Vietnamese keywords
    const hasVietnameseKeyword = this.VIETNAMESE_KEYWORDS.some((keyword) =>
      lowerQuery.includes(keyword.toLowerCase()),
    );

    if (hasVietnameseKeyword) {
      this.logger.debug('Found Vietnamese keyword in query');
      return true;
    }

    // Check for Vietnamese characters
    const hasVietnameseChars = this.VIETNAMESE_CHARS.test(query);

    if (hasVietnameseChars) {
      this.logger.debug('Found Vietnamese characters in query');
      return true;
    }

    // Check for Vietnamese tone patterns (more sophisticated detection)
    const hasTonePatterns = this.VIETNAMESE_TONE_PATTERNS.some((pattern) =>
      pattern.test(query),
    );

    if (hasTonePatterns) {
      this.logger.debug('Found Vietnamese tone patterns in query');
      return true;
    }

    return false;
  }

  /**
   * Extract Vietnamese administrative divisions from address string
   * @param address - The address string to parse
   * @returns AdministrativeInfo object with extracted divisions
   */
  static extractVietnameseAdministrative(address: string): AdministrativeInfo {
    if (!address || typeof address !== 'string') {
      return {};
    }

    const result: AdministrativeInfo = {};

    // Common Vietnamese administrative keywords
    const provinceKeywords = ['tỉnh', 'thành phố', 'tp.', 'tp'];
    const districtKeywords = ['quận', 'huyện', 'thị xã', 'q.', 'h.'];
    const wardKeywords = ['phường', 'xã', 'thị trấn', 'p.', 'x.', 'tt.'];

    // Split address by common separators
    const parts = address.split(/[,;-]/).map((part) => part.trim());

    for (const part of parts) {
      const lowerPart = part.toLowerCase();

      // Check for province indicators
      if (provinceKeywords.some((keyword) => lowerPart.includes(keyword))) {
        result.province = part.trim();
        continue;
      }

      // Check for district indicators
      if (districtKeywords.some((keyword) => lowerPart.includes(keyword))) {
        result.district = part.trim();
        continue;
      }

      // Check for ward indicators
      if (wardKeywords.some((keyword) => lowerPart.includes(keyword))) {
        result.ward = part.trim();
        continue;
      }
    }

    this.logger.debug(
      `Extracted administrative info from "${address}":`,
      result,
    );
    return result;
  }

  /**
   * Normalize Vietnamese text by removing diacritics for comparison
   * @param text - Text to normalize
   * @returns Normalized text without diacritics
   */
  static normalizeVietnameseText(text: string): string {
    if (!text) return '';

    const vietnameseMap: Record<string, string> = {
      à: 'a',
      á: 'a',
      ả: 'a',
      ã: 'a',
      ạ: 'a',
      ă: 'a',
      ắ: 'a',
      ằ: 'a',
      ẳ: 'a',
      ẵ: 'a',
      ặ: 'a',
      â: 'a',
      ấ: 'a',
      ầ: 'a',
      ẩ: 'a',
      ẫ: 'a',
      ậ: 'a',
      è: 'e',
      é: 'e',
      ẻ: 'e',
      ẽ: 'e',
      ẹ: 'e',
      ê: 'e',
      ế: 'e',
      ề: 'e',
      ể: 'e',
      ễ: 'e',
      ệ: 'e',
      ì: 'i',
      í: 'i',
      ỉ: 'i',
      ĩ: 'i',
      ị: 'i',
      ò: 'o',
      ó: 'o',
      ỏ: 'o',
      õ: 'o',
      ọ: 'o',
      ô: 'o',
      ố: 'o',
      ồ: 'o',
      ổ: 'o',
      ỗ: 'o',
      ộ: 'o',
      ơ: 'o',
      ớ: 'o',
      ờ: 'o',
      ở: 'o',
      ỡ: 'o',
      ợ: 'o',
      ù: 'u',
      ú: 'u',
      ủ: 'u',
      ũ: 'u',
      ụ: 'u',
      ư: 'u',
      ứ: 'u',
      ừ: 'u',
      ử: 'u',
      ữ: 'u',
      ự: 'u',
      ỳ: 'y',
      ý: 'y',
      ỷ: 'y',
      ỹ: 'y',
      ỵ: 'y',
      đ: 'd',
      Đ: 'D',
    };

    return text.replace(
      /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ]/g,
      (char) => vietnameseMap[char] || char,
    );
  }

  /**
   * Calculate the Vietnamese relevance score for a query
   * @param query - The search query
   * @param userCountry - Optional user country
   * @returns Number between 0-1 indicating Vietnamese relevance
   */
  static calculateVietnameseRelevance(
    query: string,
    userCountry?: string,
  ): number {
    if (!query) return 0;

    let score = 0;

    // User country weight (strongest signal)
    if (userCountry === 'VN' || userCountry === 'vn') {
      score += 0.5;
    }

    const lowerQuery = query.toLowerCase();

    // Vietnamese keyword weight
    const keywordMatches = this.VIETNAMESE_KEYWORDS.filter((keyword) =>
      lowerQuery.includes(keyword.toLowerCase()),
    ).length;
    score += Math.min(keywordMatches * 0.15, 0.3);

    // Vietnamese character weight
    const vietnameseCharCount = (query.match(this.VIETNAMESE_CHARS) || [])
      .length;
    const charRatio = vietnameseCharCount / query.length;
    score += Math.min(charRatio * 0.3, 0.2);

    // Tone pattern weight
    const tonePatternMatches = this.VIETNAMESE_TONE_PATTERNS.filter((pattern) =>
      pattern.test(query),
    ).length;
    score += Math.min(tonePatternMatches * 0.05, 0.1);

    return Math.min(score, 1);
  }

  /**
   * Check if coordinates are within Vietnam's boundaries
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns boolean indicating if coordinates are in Vietnam
   */
  static isInVietnamBounds(lat: number, lng: number): boolean {
    // Vietnam approximate boundaries
    const VIETNAM_BOUNDS = {
      north: 23.393395,
      south: 8.179769,
      east: 109.464638,
      west: 102.144003,
    };

    return (
      lat >= VIETNAM_BOUNDS.south &&
      lat <= VIETNAM_BOUNDS.north &&
      lng >= VIETNAM_BOUNDS.west &&
      lng <= VIETNAM_BOUNDS.east
    );
  }

  /**
   * Check if coordinates are within Vietnamese territory (more specific than bounds check)
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns boolean indicating if coordinates are in Vietnamese territory
   */
  static isInVietnameseTerritory(lat: number, lng: number): boolean {
    return this.isInVietnamBounds(lat, lng);
  }

  /**
   * Detect Vietnamese content and return detailed analysis
   * @param query - Search query
   * @param userCountry - Optional user country code
   * @returns Detailed Vietnamese detection result
   */
  static detectVietnameseLocation(
    query: string,
    userCountry?: string,
  ): {
    isVietnamese: boolean;
    confidence: number;
    detectedKeywords: string[];
    region?: string;
  } {
    const isVietnamese = this.isVietnameseQuery(query, userCountry);
    const confidence = this.calculateVietnameseRelevance(query, userCountry);

    // Find matching keywords
    const detectedKeywords = this.VIETNAMESE_KEYWORDS.filter((keyword) =>
      query.toLowerCase().includes(keyword.toLowerCase()),
    );

    // Try to determine region from keywords using comprehensive mapping
    const lowerQuery = query.toLowerCase();
    const region = this.detectRegionFromKeywords(lowerQuery);

    return {
      isVietnamese,
      confidence,
      detectedKeywords,
      region,
    };
  }

  /**
   * Get Vietnam region name from coordinates
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Region name or null if outside Vietnam
   */
  static getRegionFromCoordinates(lat: number, lng: number): string | null {
    const region = this.getVietnamRegion(lat, lng);
    if (!region) return null;

    // Capitalize first letter for consistency
    return region.charAt(0).toUpperCase() + region.slice(1);
  }

  /**
   * Get Vietnam region from coordinates (North, Central, South)
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Vietnam region or null if outside Vietnam
   */
  static getVietnamRegion(
    lat: number,
    lng: number,
  ): 'north' | 'central' | 'south' | null {
    if (!this.isInVietnamBounds(lat, lng)) {
      return null;
    }

    // Regional boundaries in Vietnam
    if (lat >= 19) {
      return 'north'; // North Vietnam (above Thanh Hoa)
    } else if (lat >= 14) {
      return 'central'; // Central Vietnam (Hue to Quy Nhon)
    } else {
      return 'south'; // South Vietnam (below Nha Trang)
    }
  }

  /**
   * Regional keyword mappings for efficient lookup
   */
  private static readonly REGIONAL_KEYWORDS = {
    north: new Set([
      'hanoi',
      'hà nội',
      'ha noi',
      'ha long',
      'hạ long',
      'halong',
      'sapa',
      'sa pa',
      'hai phong',
      'hải phòng',
      'thai nguyen',
      'thái nguyên',
      'ha giang',
      'hà giang',
      'cao bang',
      'cao bằng',
      'dien bien',
      'điện biên',
      'lao cai',
      'lào cai',
      'son la',
      'sơn la',
      'lai chau',
      'lai châu',
      'yen bai',
      'yên bái',
      'tuyen quang',
      'tuyên quang',
      'bac kan',
      'bắc kạn',
      'lang son',
      'lạng sơn',
      'quang ninh',
      'quảng ninh',
      'bac giang',
      'bắc giang',
      'phu tho',
      'phú thọ',
      'vinh phuc',
      'vĩnh phúc',
      'bac ninh',
      'bắc ninh',
      'hai duong',
      'hải dương',
      'hung yen',
      'hưng yên',
      'thai binh',
      'thái bình',
      'ha nam',
      'hà nam',
      'nam dinh',
      'nam định',
      'ninh binh',
      'ninh bình',
    ]),
    central: new Set([
      'hue',
      'huế',
      'hué',
      'da nang',
      'đà nẵng',
      'danang',
      'hoi an',
      'hội an',
      'thanh hoa',
      'thanh hóa',
      'nghe an',
      'nghệ an',
      'ha tinh',
      'hà tĩnh',
      'quang binh',
      'quảng bình',
      'quang tri',
      'quảng trị',
      'thua thien hue',
      'thừa thiên huế',
      'quang nam',
      'quảng nam',
      'quang ngai',
      'quảng ngãi',
      'binh dinh',
      'bình định',
      'phu yen',
      'phú yên',
      'khanh hoa',
      'khánh hòa',
      'nha trang',
      'ninh thuan',
      'ninh thuận',
      'binh thuan',
      'bình thuận',
      'kon tum',
      'gia lai',
      'dak lak',
      'đắk lắk',
      'dak nong',
      'đắk nông',
      'lam dong',
      'lâm đồng',
      'da lat',
      'đà lạt',
      'dalat',
    ]),
    south: new Set([
      'ho chi minh',
      'hồ chí minh',
      'hcm',
      'tphcm',
      'saigon',
      'sài gòn',
      'can tho',
      'cần thơ',
      'bien hoa',
      'biên hòa',
      'vung tau',
      'vũng tàu',
      'my tho',
      'mỹ tho',
      'long xuyen',
      'long xuyên',
      'rach gia',
      'rạch giá',
      'ca mau',
      'cà mau',
      'soc trang',
      'sóc trăng',
      'bac lieu',
      'bạc liêu',
      'binh phuoc',
      'bình phước',
      'tay ninh',
      'tây ninh',
      'binh duong',
      'bình dương',
      'dong nai',
      'đồng nai',
      'ba ria vung tau',
      'bà rịa vũng tàu',
      'long an',
      'tien giang',
      'tiền giang',
      'ben tre',
      'bến tre',
      'tra vinh',
      'trà vinh',
      'vinh long',
      'vĩnh long',
      'dong thap',
      'đồng tháp',
      'an giang',
      'kien giang',
      'kiên giang',
      'hau giang',
      'hậu giang',
      'phu quoc',
      'phú quốc',
      'con dao',
      'côn đảo',
      'mekong',
      'mê kông',
      'đồng bằng sông cửu long',
    ]),
  } as const;

  /**
   * Detect region from Vietnamese keywords using optimized lookup
   * @param lowerQuery - Lowercase query string
   * @returns Region string or undefined
   */
  private static detectRegionFromKeywords(
    lowerQuery: string,
  ): string | undefined {
    // Check which region matches using optimized Set lookup
    for (const [region, keywords] of Object.entries(this.REGIONAL_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword)) {
          return region.charAt(0).toUpperCase() + region.slice(1);
        }
      }
    }

    return undefined;
  }
}

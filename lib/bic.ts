import type { BICValidationResult, BICParseResult } from '@/types';

const COUNTRY_CODES = new Set([
  'AD','AE','AF','AG','AI','AL','AM','AO','AR','AS','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BM','BN','BO','BR','BS','BT','BW','BY','BZ',
  'CA','CD','CF','CG','CH','CI','CL','CM','CN','CO','CR','CU','CV','CW','CY','CZ',
  'DE','DJ','DK','DM','DO','DZ','EC','EE','EG','ER','ES','ET',
  'FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GH','GI','GL','GM','GN','GQ','GR','GT','GW','GY',
  'HK','HN','HR','HT','HU','ID','IE','IL','IM','IN','IQ','IS','IT','JE','JM','JO','JP',
  'KE','KG','KH','KI','KM','KN','KR','KW','KY','KZ',
  'LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY',
  'MA','MC','MD','ME','MG','MH','MK','ML','MM','MN','MO','MR','MS','MT','MU','MV','MW','MX','MY','MZ',
  'NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ',
  'OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY',
  'QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SK','SL','SM','SN','SO','SR',
  'SS','ST','SV','SX','SY','SZ','TC','TD','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ',
  'UA','UG','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','XK','YE','YT','ZA','ZM','ZW',
]);

const COUNTRY_NAMES: Record<string, string> = {
  AT:'Austria',AU:'Australia',BE:'Belgium',BR:'Brazil',CA:'Canada',
  CH:'Switzerland',CN:'China',CZ:'Czech Republic',DE:'Germany',DK:'Denmark',
  EE:'Estonia',ES:'Spain',FI:'Finland',FR:'France',GB:'United Kingdom',
  GR:'Greece',HK:'Hong Kong',HR:'Croatia',HU:'Hungary',ID:'Indonesia',
  IE:'Ireland',IL:'Israel',IN:'India',IT:'Italy',JP:'Japan',
  KE:'Kenya',KR:'South Korea',KW:'Kuwait',LT:'Lithuania',LU:'Luxembourg',
  LV:'Latvia',MX:'Mexico',MY:'Malaysia',NG:'Nigeria',NL:'Netherlands',
  NO:'Norway',NZ:'New Zealand',PH:'Philippines',PK:'Pakistan',PL:'Poland',
  PT:'Portugal',QA:'Qatar',RO:'Romania',RU:'Russia',SA:'Saudi Arabia',
  SE:'Sweden',SG:'Singapore',SI:'Slovenia',SK:'Slovakia',TH:'Thailand',
  TR:'Turkey',TW:'Taiwan',UA:'Ukraine',AE:'United Arab Emirates',US:'United States',
  VN:'Vietnam',ZA:'South Africa',BG:'Bulgaria',CY:'Cyprus',MT:'Malta',
  BA:'Bosnia and Herzegovina',RS:'Serbia',ME:'Montenegro',MK:'North Macedonia',
  AD:'Andorra',LI:'Liechtenstein',MC:'Monaco',SM:'San Marino',
  BH:'Bahrain',JO:'Jordan',LB:'Lebanon',EG:'Egypt',MA:'Morocco',TN:'Tunisia',
};

export function validateBIC(input: string | null | undefined): BICValidationResult {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'BIC/SWIFT code is required' };
  }

  const bic = input.replace(/\s+/g, '').toUpperCase();

  if (bic.length !== 8 && bic.length !== 11) {
    return { valid: false, error: 'BIC must be exactly 8 or 11 characters' };
  }

  const institutionCode = bic.substring(0, 4);
  if (!/^[A-Z]{4}$/.test(institutionCode)) {
    return { valid: false, error: 'Institution code (first 4 characters) must be letters only' };
  }

  const countryCode = bic.substring(4, 6);
  if (!COUNTRY_CODES.has(countryCode)) {
    return { valid: false, error: `Invalid country code "${countryCode}"` };
  }

  const locationCode = bic.substring(6, 8);
  if (!/^[A-Z0-9]{2}$/.test(locationCode)) {
    return { valid: false, error: 'Location code (characters 7-8) must be alphanumeric' };
  }

  if (bic.length === 11) {
    const branchCode = bic.substring(8, 11);
    if (!/^[A-Z0-9]{3}$/.test(branchCode)) {
      return { valid: false, error: 'Branch code (characters 9-11) must be alphanumeric' };
    }
  }

  return { valid: true };
}

export function parseBIC(input: string | null | undefined): BICParseResult {
  const validation = validateBIC(input);
  if (!validation.valid) {
    return validation;
  }

  const bic = input!.replace(/\s+/g, '').toUpperCase();
  const countryCode = bic.substring(4, 6);
  const locationCode = bic.substring(6, 8);
  const locationSecondChar = locationCode[1];

  let branchCode: string | null = null;
  let isPrimaryOffice = true;

  if (bic.length === 11) {
    branchCode = bic.substring(8, 11);
    isPrimaryOffice = branchCode === 'XXX';
  }

  return {
    valid: true,
    bic,
    institution_code: bic.substring(0, 4),
    country_code: countryCode,
    country_name: COUNTRY_NAMES[countryCode] || countryCode,
    location_code: locationCode,
    branch_code: branchCode,
    is_primary_office: isPrimaryOffice,
    is_test_bic: locationSecondChar === '0',
    is_passive_participant: locationSecondChar === '1',
    is_reverse_billing: locationSecondChar === '2',
  };
}

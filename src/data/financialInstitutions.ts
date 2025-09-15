// 金融機関データ（CSVから生成）
export interface FinancialInstitution {
  name: string;
  code: string;
  category: string;
}

export const financialInstitutions: FinancialInstitution[] = [
  { name: "商工組合中央金庫", code: "2004", category: "労働金庫・信用金庫・商工中金" },
  { name: "沖縄県労働金庫", code: "2997", category: "労働金庫・信用金庫・商工中金" },
  { name: "近畿労働金庫", code: "2978", category: "労働金庫・信用金庫・商工中金" },
  { name: "九州労働金庫", code: "2990", category: "労働金庫・信用金庫・商工中金" },
  { name: "四国労働金庫", code: "2987", category: "労働金庫・信用金庫・商工中金" },
  { name: "新潟県労働金庫", code: "2965", category: "労働金庫・信用金庫・商工中金" },
  { name: "静岡県労働金庫", code: "2968", category: "労働金庫・信用金庫・商工中金" },
  { name: "中央労働金庫", code: "2963", category: "労働金庫・信用金庫・商工中金" },
  { name: "中国労働金庫", code: "2984", category: "労働金庫・信用金庫・商工中金" },
  { name: "長野県労働金庫", code: "2966", category: "労働金庫・信用金庫・商工中金" },
  { name: "東海労働金庫", code: "2972", category: "労働金庫・信用金庫・商工中金" },
  { name: "東北労働金庫", code: "2954", category: "労働金庫・信用金庫・商工中金" },
  { name: "北海道労働金庫", code: "2951", category: "労働金庫・信用金庫・商工中金" },
  { name: "北陸労働金庫", code: "2970", category: "労働金庫・信用金庫・商工中金" },
  { name: "労働金庫連合会", code: "2950", category: "労働金庫・信用金庫・商工中金" },
  { name: "みずほ銀行", code: "0001", category: "銀行" },
  { name: "三菱UFJ銀行", code: "0005", category: "銀行" },
  { name: "三菱ＵＦＪ信託銀行", code: "0288", category: "銀行" },
  { name: "三井住友銀行", code: "0009", category: "銀行" },
  { name: "三井住友信託銀行", code: "0294", category: "銀行" },
  { name: "りそな銀行", code: "0010", category: "銀行" },
  { name: "SBI新生銀行", code: "0397", category: "銀行" },
  { name: "みずほ信託銀行", code: "0289", category: "銀行" },
  { name: "オリックス銀行", code: "0307", category: "銀行" },
  { name: "あおぞら銀行", code: "0398", category: "銀行" },
  { name: "大和ネクスト銀行", code: "0041", category: "銀行" },
  { name: "PayPay銀行", code: "0033", category: "銀行" },
  { name: "ソニー銀行", code: "0035", category: "銀行" },
  { name: "楽天銀行", code: "0036", category: "銀行" },
  { name: "住信SBIネット銀行", code: "0038", category: "銀行" },
  { name: "auじぶん銀行", code: "0039", category: "銀行" },
  { name: "イオン銀行", code: "0040", category: "銀行" },
  { name: "ローソン銀行", code: "0042", category: "銀行" },
  { name: "UI銀行", code: "0044", category: "銀行" },
  { name: "GMOあおぞらネット銀行", code: "0310", category: "銀行" },
  { name: "千葉銀行", code: "0134", category: "銀行" },
  { name: "横浜銀行", code: "0138", category: "銀行" },
  { name: "静岡銀行", code: "0149", category: "銀行" },
  { name: "常陽銀行", code: "0130", category: "銀行" },
  { name: "群馬銀行", code: "0128", category: "銀行" },
  { name: "足利銀行", code: "0129", category: "銀行" },
  { name: "武蔵野銀行", code: "0133", category: "銀行" },
  { name: "千葉興業銀行", code: "0135", category: "銀行" },
  { name: "東京スター銀行", code: "0526", category: "銀行" },
  { name: "関西みらい銀行", code: "0159", category: "銀行" },
  { name: "池田泉州銀行", code: "0161", category: "銀行" },
  { name: "紀陽銀行", code: "0163", category: "銀行" },
  { name: "但馬銀行", code: "0164", category: "銀行" },
  { name: "鳥取銀行", code: "0166", category: "銀行" },
  { name: "山陰合同銀行", code: "0167", category: "銀行" },
  { name: "中国銀行", code: "0168", category: "銀行" },
  { name: "広島銀行", code: "0169", category: "銀行" },
  { name: "山口銀行", code: "0170", category: "銀行" },
  { name: "阿波銀行", code: "0172", category: "銀行" },
  { name: "百十四銀行", code: "0173", category: "銀行" },
  { name: "伊予銀行", code: "0174", category: "銀行" },
  { name: "四国銀行", code: "0175", category: "銀行" },
  { name: "福岡銀行", code: "0177", category: "銀行" },
  { name: "筑邦銀行", code: "0178", category: "銀行" },
  { name: "佐賀銀行", code: "0179", category: "銀行" },
  { name: "十八親和銀行", code: "0181", category: "銀行" },
  { name: "肥後銀行", code: "0182", category: "銀行" },
  { name: "大分銀行", code: "0183", category: "銀行" },
  { name: "宮崎銀行", code: "0184", category: "銀行" },
  { name: "鹿児島銀行", code: "0185", category: "銀行" },
  { name: "琉球銀行", code: "0187", category: "銀行" },
  { name: "沖縄銀行", code: "0188", category: "銀行" },
  { name: "西日本シティ銀行", code: "0190", category: "銀行" },
  { name: "北九州銀行", code: "0191", category: "銀行" },
  { name: "北海道銀行", code: "0116", category: "銀行" },
  { name: "青森みちのく銀行", code: "0117", category: "銀行" },
  { name: "秋田銀行", code: "0119", category: "銀行" },
  { name: "北都銀行", code: "0120", category: "銀行" },
  { name: "荘内銀行", code: "0121", category: "銀行" },
  { name: "山形銀行", code: "0122", category: "銀行" },
  { name: "岩手銀行", code: "0123", category: "銀行" },
  { name: "東北銀行", code: "0124", category: "銀行" },
  { name: "七十七銀行", code: "0125", category: "銀行" },
  { name: "東邦銀行", code: "0126", category: "銀行" },
  { name: "きらぼし銀行", code: "0137", category: "銀行" },
  { name: "山梨中央銀行", code: "0142", category: "銀行" },
  { name: "八十二銀行", code: "0143", category: "銀行" },
  { name: "北陸銀行", code: "0144", category: "銀行" },
  { name: "富山銀行", code: "0145", category: "銀行" },
  { name: "北國銀行", code: "0146", category: "銀行" },
  { name: "福井銀行", code: "0147", category: "銀行" },
  { name: "スルガ銀行", code: "0150", category: "銀行" },
  { name: "清水銀行", code: "0151", category: "銀行" },
  { name: "大垣共立銀行", code: "0152", category: "銀行" },
  { name: "十六銀行", code: "0153", category: "銀行" },
  { name: "三十三銀行", code: "0154", category: "銀行" },
  { name: "百五銀行", code: "0155", category: "銀行" },
  { name: "滋賀銀行", code: "0157", category: "銀行" },
  { name: "京都銀行", code: "0158", category: "銀行" },
  { name: "南都銀行", code: "0162", category: "銀行" },
  { name: "沖縄海邦銀行", code: "0596", category: "銀行" },
  { name: "愛媛銀行", code: "0576", category: "銀行" },
  { name: "香川銀行", code: "0573", category: "銀行" },
  { name: "高知銀行", code: "0578", category: "銀行" },
  { name: "徳島大正銀行", code: "0572", category: "銀行" },
  { name: "もみじ銀行", code: "0569", category: "銀行" },
  { name: "西京銀行", code: "0570", category: "銀行" },
  { name: "トマト銀行", code: "0566", category: "銀行" },
  { name: "島根銀行", code: "0565", category: "銀行" },
  { name: "みなと銀行", code: "0562", category: "銀行" },
  { name: "あいち銀行", code: "0542", category: "銀行" },
  { name: "名古屋銀行", code: "0543", category: "銀行" },
  { name: "静岡中央銀行", code: "0538", category: "銀行" },
  { name: "福邦銀行", code: "0537", category: "銀行" },
  { name: "富山第一銀行", code: "0534", category: "銀行" },
  { name: "長野銀行", code: "0533", category: "銀行" },
  { name: "大光銀行", code: "0532", category: "銀行" },
  { name: "神奈川銀行", code: "0530", category: "銀行" },
  { name: "東日本銀行", code: "0525", category: "銀行" },
  { name: "京葉銀行", code: "0522", category: "銀行" },
  { name: "東和銀行", code: "0516", category: "銀行" },
  { name: "栃木銀行", code: "0517", category: "銀行" },
  { name: "大東銀行", code: "0514", category: "銀行" },
  { name: "福島銀行", code: "0513", category: "銀行" },
  { name: "仙台銀行", code: "0512", category: "銀行" },
  { name: "北日本銀行", code: "0509", category: "銀行" },
  { name: "きらやか銀行", code: "0508", category: "銀行" },
  { name: "北洋銀行", code: "0501", category: "銀行" },
  // 信用金庫（一部抜粋）
  { name: "アイオー信用金庫", code: "1206", category: "労働金庫・信用金庫・商工中金" },
  { name: "あぶくま信用金庫", code: "1188", category: "労働金庫・信用金庫・商工中金" },
  { name: "アルプス中央信用金庫", code: "1396", category: "労働金庫・信用金庫・商工中金" },
  { name: "いちい信用金庫", code: "1553", category: "労働金庫・信用金庫・商工中金" },
  { name: "おかやま信用金庫", code: "1732", category: "労働金庫・信用金庫・商工中金" },
  { name: "かながわ信用金庫", code: "1281", category: "労働金庫・信用金庫・商工中金" },
  { name: "きのくに信用金庫", code: "1674", category: "労働金庫・信用金庫・商工中金" },
  { name: "コザ信用金庫", code: "1996", category: "労働金庫・信用金庫・商工中金" },
  { name: "さがみ信用金庫", code: "1288", category: "労働金庫・信用金庫・商工中金" },
  { name: "さわやか信用金庫", code: "1310", category: "労働金庫・信用金庫・商工中金" },
  { name: "しずおか焼津信用金庫", code: "1501", category: "労働金庫・信用金庫・商工中金" },
  { name: "しののめ信用金庫", code: "1211", category: "労働金庫・信用金庫・商工中金" },
  { name: "城南信用金庫", code: "1344", category: "労働金庫・信用金庫・商工中金" },
  { name: "城北信用金庫", code: "1351", category: "労働金庫・信用金庫・商工中金" },
  { name: "世田谷信用金庫", code: "1348", category: "労働金庫・信用金庫・商工中金" },
  { name: "多摩信用金庫", code: "1360", category: "労働金庫・信用金庫・商工中金" },
  { name: "東京信用金庫", code: "1349", category: "労働金庫・信用金庫・商工中金" },
  { name: "巣鴨信用金庫", code: "1356", category: "労働金庫・信用金庫・商工中金" },
  { name: "横浜信用金庫", code: "1280", category: "労働金庫・信用金庫・商工中金" },
  // その他の金融機関（一部抜粋）
  { name: "農林中央金庫", code: "3000", category: "その他" },
  { name: "信金中央金庫", code: "1000", category: "その他" }
];

// カテゴリ別に金融機関を分類
export const getInstitutionsByCategory = () => {
  const categories = [...new Set(financialInstitutions.map(inst => inst.category))];
  return categories.reduce((acc, category) => {
    acc[category] = financialInstitutions.filter(inst => inst.category === category);
    return acc;
  }, {} as Record<string, FinancialInstitution[]>);
};

// 金融機関名で検索
export const searchInstitutions = (query: string) => {
  if (!query) return [];
  return financialInstitutions.filter(inst => 
    inst.name.toLowerCase().includes(query.toLowerCase())
  );
};

// 金融機関コードで検索
export const getInstitutionByCode = (code: string) => {
  return financialInstitutions.find(inst => inst.code === code);
};

// 金融機関名で検索
export const getInstitutionByName = (name: string) => {
  return financialInstitutions.find(inst => inst.name === name);
};
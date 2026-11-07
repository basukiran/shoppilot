import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Loader2, Search, UserRound } from 'lucide-react';
import { getAuthorPortraitUrl } from '@/components/AuthorByline';
import { apiFetch } from '@/lib/api';
import { toBookProduct, type BookApiRecord } from '@/lib/bookProducts';
import { useLanguage, type SiteLanguage } from '@/lib/language';
import type { Product } from '@/types';

type AuthorBio = Record<SiteLanguage, string>;

const authorBios: Record<string, AuthorBio> = {
  'joseph murphy': {
    en: 'Joseph Murphy wrote about the connection between thought, belief, and everyday choices. His work invites readers to reflect on how repeated ideas can shape confidence and habits. The Power of Your Subconscious Mind remains his best-known guide to personal growth.',
    kn: 'ಜೋಸೆಫ್ ಮರ್ಫಿ ಆಲೋಚನೆ, ನಂಬಿಕೆ ಮತ್ತು ದೈನಂದಿನ ಆಯ್ಕೆಗಳ ನಡುವಿನ ಸಂಬಂಧದ ಬಗ್ಗೆ ಬರೆದರು. ಮನಸ್ಸಿನಲ್ಲಿ ಮತ್ತೆ ಮತ್ತೆ ಮೂಡುವ ಆಲೋಚನೆಗಳು ಆತ್ಮವಿಶ್ವಾಸ ಮತ್ತು ಅಭ್ಯಾಸಗಳನ್ನು ಹೇಗೆ ರೂಪಿಸುತ್ತವೆ ಎಂಬುದನ್ನು ಅವರ ಬರಹಗಳು ಚಿಂತಿಸಲು ಪ್ರೇರೇಪಿಸುತ್ತವೆ. The Power of Your Subconscious Mind ಅವರ ಅತ್ಯಂತ ಪ್ರಸಿದ್ಧ ಕೃತಿ.',
    hi: 'जोसेफ़ मर्फ़ी ने विचार, विश्वास और रोज़मर्रा के फैसलों के संबंध पर लिखा। उनकी किताबें बताती हैं कि बार-बार मन में आने वाले विचार आत्मविश्वास और आदतों को कैसे आकार दे सकते हैं। The Power of Your Subconscious Mind उनकी सबसे प्रसिद्ध पुस्तक है।',
  },
  'francesc miralles': {
    en: 'Francesc Miralles is a Spanish writer and journalist whose work often explores meaning, wellbeing, and the choices that shape a fulfilling life. He writes in an accessible, reflective style for readers interested in personal growth. His books encourage curiosity about how people find purpose in ordinary days.',
    kn: 'ಫ್ರಾನ್ಸೆಸ್ಕ್ ಮಿರಾಲೆಸ್ ಸ್ಪೇನ್‌ನ ಲೇಖಕ ಮತ್ತು ಪತ್ರಕರ್ತರು. ಅರ್ಥಪೂರ್ಣ ಜೀವನ, ಕ್ಷೇಮ ಮತ್ತು ನಮ್ಮ ಆಯ್ಕೆಗಳು ಜೀವನವನ್ನು ಹೇಗೆ ರೂಪಿಸುತ್ತವೆ ಎಂಬ ವಿಷಯಗಳು ಅವರ ಬರಹಗಳಲ್ಲಿ ಕಾಣುತ್ತವೆ. ಸರಳ ಹಾಗೂ ಚಿಂತನೆಗೆ ಹಚ್ಚುವ ಶೈಲಿಯಲ್ಲಿ ಅವರು ವೈಯಕ್ತಿಕ ಬೆಳವಣಿಗೆಯ ಬಗ್ಗೆ ಬರೆಯುತ್ತಾರೆ.',
    hi: 'फ़्रांसेस्क मिरालेस स्पेन के लेखक और पत्रकार हैं। उनकी रचनाओं में जीवन का अर्थ, बेहतर जीवनशैली और हमारे फैसलों का प्रभाव जैसे विषय आते हैं। वे व्यक्तिगत विकास पर सहज और विचारशील शैली में लिखते हैं।',
  },
  'morgan housel': {
    en: 'Morgan Housel is a financial writer who explains money through the lens of human behavior. Rather than focusing only on numbers, he explores patience, risk, luck, and the personal stories behind financial decisions. His writing helps readers think about building a healthier relationship with money over time.',
    kn: 'ಮೋರ್ಗನ್ ಹೌಸೆಲ್ ಮಾನವ ನಡವಳಿಕೆಯ ದೃಷ್ಟಿಯಿಂದ ಹಣಕಾಸಿನ ವಿಷಯಗಳನ್ನು ವಿವರಿಸುವ ಲೇಖಕರು. ಅಂಕಿಗಳಷ್ಟೇ ಅಲ್ಲದೆ ತಾಳ್ಮೆ, ಅಪಾಯ, ಅದೃಷ್ಟ ಮತ್ತು ಹಣದ ನಿರ್ಧಾರಗಳ ಹಿಂದೆ ಇರುವ ವೈಯಕ್ತಿಕ ಕಥೆಗಳನ್ನೂ ಅವರು ಪರಿಶೀಲಿಸುತ್ತಾರೆ. ಹಣದೊಂದಿಗೆ ಆರೋಗ್ಯಕರ ಸಂಬಂಧ ಬೆಳೆಸಲು ಅವರ ಬರಹಗಳು ಸಹಾಯ ಮಾಡುತ್ತವೆ.',
    hi: 'मॉर्गन हाउज़ेल मानव व्यवहार के नज़रिए से पैसों की बात समझाने वाले लेखक हैं। वे केवल आँकड़ों पर नहीं, बल्कि धैर्य, जोखिम, किस्मत और आर्थिक फैसलों के पीछे की निजी कहानियों पर भी ध्यान देते हैं। उनकी लिखाई पैसों के साथ बेहतर रिश्ता बनाने में मदद करती है।',
  },
  'abdul kalam': {
    en: 'A. P. J. Abdul Kalam was an aerospace scientist and the 11th President of India. He worked on India’s space and missile programmes and became widely admired for encouraging students to learn, imagine, and serve society. His books share memories, ambitions, and lessons from a life devoted to science and public service.',
    kn: 'ಎ. ಪಿ. ಜೆ. ಅಬ್ದುಲ್ ಕಲಾಂ ಅವರು ಏರೋಸ್ಪೇಸ್ ವಿಜ್ಞಾನಿ ಮತ್ತು ಭಾರತದ 11ನೇ ರಾಷ್ಟ್ರಪತಿಯಾಗಿದ್ದರು. ಭಾರತದ ಬಾಹ್ಯಾಕಾಶ ಮತ್ತು ಕ್ಷಿಪಣಿ ಕಾರ್ಯಕ್ರಮಗಳಲ್ಲಿ ಕೆಲಸ ಮಾಡಿದ ಅವರು, ವಿದ್ಯಾರ್ಥಿಗಳು ಕಲಿಯಲು, ಕನಸು ಕಾಣಲು ಮತ್ತು ಸಮಾಜಕ್ಕೆ ಸೇವೆ ಸಲ್ಲಿಸಲು ಪ್ರೇರೇಪಿಸಿದರು. ಅವರ ಪುಸ್ತಕಗಳಲ್ಲಿ ವಿಜ್ಞಾನ, ಕನಸುಗಳು ಮತ್ತು ಸಾರ್ವಜನಿಕ ಸೇವೆಯ ಅನುಭವಗಳು ಮೂಡಿಬರುತ್ತವೆ.',
    hi: 'ए. पी. जे. अब्दुल कलाम एयरोस्पेस वैज्ञानिक और भारत के 11वें राष्ट्रपति थे। उन्होंने भारत के अंतरिक्ष और मिसाइल कार्यक्रमों में काम किया और विद्यार्थियों को सीखने, सपने देखने तथा समाज की सेवा करने के लिए प्रेरित किया। उनकी किताबों में विज्ञान और जनसेवा से जुड़े अनुभव मिलते हैं।',
  },
  'bhagat singh': {
    en: 'Bhagat Singh was an Indian revolutionary whose political writings and prison essays continue to be read today. His work reveals a young thinker deeply engaged with freedom, justice, and the future of society. Readers encounter both his courage and his thoughtful, questioning voice in these writings.',
    kn: 'ಭಗತ್ ಸಿಂಗ್ ಭಾರತೀಯ ಕ್ರಾಂತಿಕಾರಿಯಾಗಿದ್ದು, ಅವರ ರಾಜಕೀಯ ಬರಹಗಳು ಮತ್ತು ಜೈಲಿನಲ್ಲಿ ಬರೆದ ಪ್ರಬಂಧಗಳು ಇಂದಿಗೂ ಓದಲ್ಪಡುತ್ತವೆ. ಸ್ವಾತಂತ್ರ್ಯ, ನ್ಯಾಯ ಮತ್ತು ಸಮಾಜದ ಭವಿಷ್ಯದ ಬಗ್ಗೆ ಆಳವಾಗಿ ಚಿಂತಿಸಿದ ಯುವಕನ ಧ್ವನಿ ಅವರ ಕೃತಿಗಳಲ್ಲಿ ಕೇಳಿಸುತ್ತದೆ. ಅವರ ಬರಹಗಳಲ್ಲಿ ಧೈರ್ಯದ ಜೊತೆಗೆ ಪ್ರಶ್ನಿಸುವ ಚಿಂತನೆಯೂ ಕಾಣುತ್ತದೆ.',
    hi: 'भगत सिंह भारतीय क्रांतिकारी थे। उनके राजनीतिक लेख और जेल में लिखे निबंध आज भी पढ़े जाते हैं। उनकी रचनाओं में स्वतंत्रता, न्याय और समाज के भविष्य पर विचार करने वाले एक युवा चिंतक की आवाज़ सुनाई देती है।',
  },
  'cal newport': {
    en: 'Cal Newport is a computer science professor and author who studies how people work and learn. He writes about focused attention, meaningful productivity, and using digital tools with intention. His books offer practical ways to protect time for demanding and worthwhile work.',
    kn: 'ಕ್ಯಾಲ್ ನ್ಯೂಪೋರ್ಟ್ ಕಂಪ್ಯೂಟರ್ ವಿಜ್ಞಾನ ಪ್ರಾಧ್ಯಾಪಕ ಮತ್ತು ಲೇಖಕರು. ಜನರು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತಾರೆ ಮತ್ತು ಕಲಿಯುತ್ತಾರೆ ಎಂಬುದರ ಬಗ್ಗೆ ಅವರು ಅಧ್ಯಯನ ಮಾಡುತ್ತಾರೆ. ಏಕಾಗ್ರತೆ, ಅರ್ಥಪೂರ್ಣ ಉತ್ಪಾದಕತೆ ಮತ್ತು ಡಿಜಿಟಲ್ ಸಾಧನಗಳ ಜಾಣ ಬಳಕೆಯ ಬಗ್ಗೆ ಅವರ ಪುಸ್ತಕಗಳು ಪ್ರಾಯೋಗಿಕ ಸಲಹೆ ನೀಡುತ್ತವೆ.',
    hi: 'कैल न्यूपोर्ट कंप्यूटर विज्ञान के प्रोफ़ेसर और लेखक हैं। वे इस बात का अध्ययन करते हैं कि लोग कैसे काम करते और सीखते हैं। उनकी किताबें एकाग्रता, सार्थक उत्पादकता और डिजिटल साधनों का सोच-समझकर उपयोग करने के व्यावहारिक तरीके बताती हैं।',
  },
  'robert kiyosaki': {
    en: 'Robert Kiyosaki is an author and entrepreneur known for writing about financial education. His books encourage readers to learn how income, assets, saving, and investing affect long-term choices. His work has introduced many readers to conversations about financial literacy and independence.',
    kn: 'ರಾಬರ್ಟ್ ಕಿಯೋಸಾಕಿ ಹಣಕಾಸು ಶಿಕ್ಷಣದ ಬಗ್ಗೆ ಬರೆಯುವ ಲೇಖಕ ಮತ್ತು ಉದ್ಯಮಿಯಾಗಿದ್ದಾರೆ. ಆದಾಯ, ಆಸ್ತಿ, ಉಳಿತಾಯ ಮತ್ತು ಹೂಡಿಕೆ ದೀರ್ಘಕಾಲದ ನಿರ್ಧಾರಗಳಿಗೆ ಹೇಗೆ ಸಂಬಂಧಿಸುತ್ತವೆ ಎಂಬುದನ್ನು ತಿಳಿಯಲು ಅವರ ಪುಸ್ತಕಗಳು ಪ್ರೇರೇಪಿಸುತ್ತವೆ. ಹಣಕಾಸಿನ ಅರಿವು ಮತ್ತು ಸ್ವಾವಲಂಬನೆಯ ಬಗ್ಗೆ ಚರ್ಚೆ ಆರಂಭಿಸಲು ಅವರ ಕೃತಿಗಳು ಅನೇಕ ಓದುಗರಿಗೆ ಸಹಾಯ ಮಾಡಿವೆ.',
    hi: 'रॉबर्ट कियोसाकी वित्तीय शिक्षा पर लिखने वाले लेखक और उद्यमी हैं। उनकी किताबें आय, संपत्ति, बचत और निवेश को समझकर लंबे समय के फैसले लेने के लिए प्रेरित करती हैं। उनकी रचनाओं ने कई पाठकों को वित्तीय समझ और आत्मनिर्भरता पर सोचने का अवसर दिया है।',
  },
  'dale carnegie': {
    en: 'Dale Carnegie was an American writer and lecturer whose work focuses on communication and relationships. He believed that listening, empathy, and genuine interest can improve how people work and live together. His practical advice has remained popular with readers seeking confidence in everyday interactions.',
    kn: 'ಡೇಲ್ ಕಾರ್ನೆಗಿ ಅಮೆರಿಕದ ಲೇಖಕ ಮತ್ತು ಉಪನ್ಯಾಸಕರಾಗಿದ್ದರು. ಸಂವಹನ ಮತ್ತು ಮಾನವ ಸಂಬಂಧಗಳು ಅವರ ಬರಹಗಳ ಮುಖ್ಯ ವಿಷಯ. ಗಮನದಿಂದ ಕೇಳುವುದು, ಸಹಾನುಭೂತಿ ಮತ್ತು ನಿಜವಾದ ಆಸಕ್ತಿ ಕೆಲಸದ ಹಾಗೂ ದೈನಂದಿನ ಸಂಬಂಧಗಳನ್ನು ಉತ್ತಮಗೊಳಿಸಬಹುದು ಎಂದು ಅವರು ನಂಬಿದ್ದರು.',
    hi: 'डेल कार्नेगी अमेरिकी लेखक और व्याख्याता थे। उनके लेखन का केंद्र संवाद और मानवीय संबंध हैं। वे मानते थे कि ध्यान से सुनना, सहानुभूति और सच्ची दिलचस्पी रोज़मर्रा के रिश्तों को बेहतर बना सकती है।',
  },
  'carol dweck': {
    en: 'Carol S. Dweck is a psychologist whose research examines motivation, learning, and beliefs about ability. Her work explains how the way people respond to challenge can influence growth and achievement. She encourages readers to stay open to learning and to treat effort as part of development.',
    kn: 'ಕ್ಯಾರಲ್ ಎಸ್. ಡ್ವೆಕ್ ಮನೋವಿಜ್ಞಾನಿ; ಪ್ರೇರಣೆ, ಕಲಿಕೆ ಮತ್ತು ಸಾಮರ್ಥ್ಯದ ಬಗ್ಗೆ ಇರುವ ನಂಬಿಕೆಗಳನ್ನು ಅವರು ಅಧ್ಯಯನ ಮಾಡುತ್ತಾರೆ. ಸವಾಲುಗಳಿಗೆ ನಾವು ಹೇಗೆ ಪ್ರತಿಕ್ರಿಯಿಸುತ್ತೇವೆ ಎಂಬುದು ಬೆಳವಣಿಗೆ ಮತ್ತು ಸಾಧನೆಗೆ ಪ್ರಭಾವ ಬೀರುತ್ತದೆ ಎಂದು ಅವರ ಸಂಶೋಧನೆ ವಿವರಿಸುತ್ತದೆ. ಕಲಿಕೆಗೆ ತೆರೆದ ಮನಸ್ಸಿನಿಂದಿದ್ದು ಪ್ರಯತ್ನವನ್ನು ಬೆಳವಣಿಗೆಯ ಭಾಗವಾಗಿ ನೋಡುವಂತೆ ಅವರು ಪ್ರೇರೇಪಿಸುತ್ತಾರೆ.',
    hi: 'कैरोल एस. ड्वेक मनोवैज्ञानिक हैं और प्रेरणा, सीखने तथा योग्यता से जुड़ी मान्यताओं पर शोध करती हैं। उनका काम बताता है कि चुनौतियों के प्रति हमारी प्रतिक्रिया विकास और उपलब्धि को प्रभावित कर सकती है। वे सीखने के लिए खुले रहने और प्रयास को विकास का हिस्सा मानने के लिए प्रेरित करती हैं।',
  },
  'angela duckworth': {
    en: 'Angela Duckworth is a psychologist and researcher who studies perseverance and achievement. Her work looks at how sustained effort and long-term interest can help people keep moving toward difficult goals. She writes for readers interested in learning, character, and what supports progress over time.',
    kn: 'ಏಂಜೆಲಾ ಡಕ್‌ವರ್ತ್ ಮನೋವಿಜ್ಞಾನಿ ಮತ್ತು ಸಂಶೋಧಕಿ; ಪರಿಶ್ರಮ ಮತ್ತು ಸಾಧನೆಯ ಬಗ್ಗೆ ಅವರು ಅಧ್ಯಯನ ಮಾಡುತ್ತಾರೆ. ದೀರ್ಘಕಾಲದ ಆಸಕ್ತಿ ಮತ್ತು ನಿರಂತರ ಪ್ರಯತ್ನ ಕಷ್ಟವಾದ ಗುರಿಗಳತ್ತ ಸಾಗಲು ಹೇಗೆ ನೆರವಾಗುತ್ತವೆ ಎಂಬುದನ್ನು ಅವರ ಕೆಲಸ ಪರಿಶೀಲಿಸುತ್ತದೆ. ಕಲಿಕೆ, ಸ್ವಭಾವ ಮತ್ತು ನಿರಂತರ ಪ್ರಗತಿಯಲ್ಲಿ ಆಸಕ್ತಿ ಇರುವ ಓದುಗರಿಗಾಗಿ ಅವರು ಬರೆಯುತ್ತಾರೆ.',
    hi: 'एंजेला डकवर्थ मनोवैज्ञानिक और शोधकर्ता हैं, जो लगन और उपलब्धि का अध्ययन करती हैं। उनका काम देखता है कि लगातार प्रयास और लंबे समय की रुचि कठिन लक्ष्यों की ओर बढ़ने में कैसे मदद करते हैं। वे सीखने, चरित्र और समय के साथ प्रगति में रुचि रखने वाले पाठकों के लिए लिखती हैं।',
  },
  'ichiro kishimi': {
    en: 'Ichiro Kishimi is a Japanese philosopher and counselor whose writing introduces ideas from Adlerian psychology. He explores how people can understand their choices, relationships, and sense of freedom. His accessible conversations invite readers to reflect on living with greater courage and responsibility.',
    kn: 'ಇಚಿರೋ ಕಿಶಿಮಿ ಜಪಾನಿನ ತತ್ವಜ್ಞಾನಿ ಮತ್ತು ಸಲಹೆಗಾರರು; ಅಡ್ಲೇರಿಯನ್ ಮನೋವಿಜ್ಞಾನದ ಆಲೋಚನೆಗಳನ್ನು ಅವರು ಓದುಗರಿಗೆ ಪರಿಚಯಿಸುತ್ತಾರೆ. ಆಯ್ಕೆಗಳು, ಸಂಬಂಧಗಳು ಮತ್ತು ಸ್ವಾತಂತ್ರ್ಯದ ಭಾವನೆಯನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳುವ ಬಗ್ಗೆ ಅವರು ಬರೆಯುತ್ತಾರೆ. ಧೈರ್ಯ ಮತ್ತು ಜವಾಬ್ದಾರಿಯಿಂದ ಬದುಕುವ ಕುರಿತು ಅವರ ಸಂವಾದಾತ್ಮಕ ಶೈಲಿ ಚಿಂತನೆಗೆ ಆಹ್ವಾನಿಸುತ್ತದೆ.',
    hi: 'इचिरो किशिमी जापानी दार्शनिक और परामर्शदाता हैं। उनका लेखन एडलरियन मनोविज्ञान के विचारों को सरल रूप में प्रस्तुत करता है और फैसलों, रिश्तों तथा स्वतंत्रता की भावना पर सोचने को आमंत्रित करता है। उनकी संवादात्मक शैली पाठकों को साहस और जिम्मेदारी के साथ जीने पर विचार करने में मदद करती है।',
  },
  'fumitake koga': {
    en: 'Fumitake Koga is a Japanese writer who collaborates with philosopher Ichiro Kishimi. Together they present ideas about psychology and everyday life through clear, dialogue-based writing. Their work encourages readers to question familiar assumptions and consider new ways to approach relationships and personal choices.',
    kn: 'ಫುಮಿತಾಕೆ ಕೋಗಾ ಜಪಾನಿನ ಲೇಖಕರು ಮತ್ತು ತತ್ವಜ್ಞಾನಿ ಇಚಿರೋ ಕಿಶಿಮಿ ಅವರೊಂದಿಗೆ ಸಹಕರಿಸುತ್ತಾರೆ. ಮನೋವಿಜ್ಞಾನ ಮತ್ತು ದೈನಂದಿನ ಜೀವನದ ಆಲೋಚನೆಗಳನ್ನು ಸರಳ ಸಂವಾದಗಳ ಮೂಲಕ ಓದುಗರಿಗೆ ತಲುಪಿಸುತ್ತಾರೆ. ಪರಿಚಿತ ನಂಬಿಕೆಗಳನ್ನು ಪ್ರಶ್ನಿಸಿ, ಸಂಬಂಧಗಳು ಮತ್ತು ವೈಯಕ್ತಿಕ ಆಯ್ಕೆಗಳನ್ನು ಹೊಸ ದೃಷ್ಟಿಯಿಂದ ನೋಡುವಂತೆ ಅವರ ಬರಹಗಳು ಪ್ರೇರೇಪಿಸುತ್ತವೆ.',
    hi: 'फुमिताके कोगा जापानी लेखक हैं और दार्शनिक इचिरो किशिमी के साथ मिलकर लिखते हैं। वे मनोविज्ञान और रोज़मर्रा के जीवन के विचारों को स्पष्ट संवादों के माध्यम से प्रस्तुत करते हैं। उनका काम पाठकों को पुरानी धारणाओं पर सवाल करने और रिश्तों व फैसलों को नए नज़रिए से देखने के लिए प्रेरित करता है।',
  },
  'bipan chandra': {
    en: 'Bipan Chandra was an Indian historian whose scholarship focused on modern India and the freedom movement. His writing helps readers place political events within their wider social and economic context. His books remain useful for anyone seeking a thoughtful introduction to India’s modern history.',
    kn: 'ಬಿಪನ್ ಚಂದ್ರ ಆಧುನಿಕ ಭಾರತ ಮತ್ತು ಸ್ವಾತಂತ್ರ್ಯ ಚಳವಳಿಯ ಇತಿಹಾಸದ ಮೇಲೆ ಕೆಲಸ ಮಾಡಿದ ಭಾರತೀಯ ಇತಿಹಾಸಕಾರರಾಗಿದ್ದರು. ರಾಜಕೀಯ ಘಟನೆಗಳನ್ನು ಅವುಗಳ ಸಾಮಾಜಿಕ ಮತ್ತು ಆರ್ಥಿಕ ಹಿನ್ನೆಲೆಯೊಂದಿಗೆ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಅವರ ಬರಹಗಳು ಸಹಾಯ ಮಾಡುತ್ತವೆ. ಭಾರತದ ಆಧುನಿಕ ಇತಿಹಾಸವನ್ನು ತಿಳಿಯಲು ಅವರ ಪುಸ್ತಕಗಳು ಉಪಯುಕ್ತ ಪರಿಚಯ ನೀಡುತ್ತವೆ.',
    hi: 'बिपिन चंद्र आधुनिक भारत और स्वतंत्रता आंदोलन पर काम करने वाले भारतीय इतिहासकार थे। उनकी रचनाएँ राजनीतिक घटनाओं को सामाजिक और आर्थिक संदर्भ में समझने में मदद करती हैं। भारत के आधुनिक इतिहास से परिचित होने के लिए उनकी किताबें उपयोगी हैं।',
  },
  'shivaram karanth': {
    en: 'K. Shivaram Karanth was a major Kannada writer, novelist, playwright, and public intellectual. His interests reached beyond literature into nature, culture, education, and the arts. His wide-ranging body of work is an important part of Kannada writing and continues to invite new readers.',
    kn: 'ಕೆ. ಶಿವರಾಮ ಕಾರಂತರು ಕನ್ನಡದ ಪ್ರಮುಖ ಸಾಹಿತಿ, ಕಾದಂಬರಿಕಾರ, ನಾಟಕಕಾರ ಮತ್ತು ಚಿಂತಕರಾಗಿದ್ದರು. ಸಾಹಿತ್ಯದ ಜೊತೆಗೆ ಪ್ರಕೃತಿ, ಸಂಸ್ಕೃತಿ, ಶಿಕ್ಷಣ ಮತ್ತು ಕಲೆಗಳಲ್ಲಿಯೂ ಅವರ ಆಸಕ್ತಿ ವಿಸ್ತರಿಸಿತ್ತು. ಕನ್ನಡ ಸಾಹಿತ್ಯಕ್ಕೆ ಅವರು ನೀಡಿದ ವೈವಿಧ್ಯಮಯ ಕೊಡುಗೆ ಇಂದಿಗೂ ಹೊಸ ಓದುಗರನ್ನು ಸೆಳೆಯುತ್ತದೆ.',
    hi: 'के. शिवराम कारंत कन्नड़ के प्रमुख लेखक, उपन्यासकार, नाटककार और विचारक थे। साहित्य के साथ उनकी रुचि प्रकृति, संस्कृति, शिक्षा और कला तक फैली थी। कन्नड़ साहित्य में उनका व्यापक योगदान आज भी नए पाठकों को आकर्षित करता है।',
  },
  'maxwell maltz': {
    en: 'Maxwell Maltz was an American surgeon who later wrote about self-image and behavior. He explored how the way people see themselves can affect their choices and confidence. His work combines practical reflection with ideas about setting goals and making lasting personal changes.',
    kn: 'ಮ್ಯಾಕ್ಸ್‌ವೆಲ್ ಮಾಲ್ಟ್ಸ್ ಅಮೆರಿಕದ ಶಸ್ತ್ರಚಿಕಿತ್ಸಕರಾಗಿದ್ದು, ನಂತರ ಸ್ವಚಿತ್ರ ಮತ್ತು ನಡವಳಿಕೆಯ ಬಗ್ಗೆ ಬರೆದರು. ನಾವು ನಮ್ಮನ್ನು ಹೇಗೆ ನೋಡುತ್ತೇವೆ ಎಂಬುದು ಆಯ್ಕೆಗಳು ಮತ್ತು ಆತ್ಮವಿಶ್ವಾಸದ ಮೇಲೆ ಪರಿಣಾಮ ಬೀರಬಹುದು ಎಂದು ಅವರು ಪರಿಶೀಲಿಸಿದರು. ಗುರಿ ನಿಗದಿ ಮತ್ತು ಸ್ಥಿರ ವೈಯಕ್ತಿಕ ಬದಲಾವಣೆಗಳ ಕುರಿತು ಅವರ ಬರಹಗಳು ಚಿಂತನೆಗೆ ಪ್ರೇರೇಪಿಸುತ್ತವೆ.',
    hi: 'मैक्सवेल माल्ट्ज अमेरिकी सर्जन थे और बाद में उन्होंने आत्म-छवि तथा व्यवहार पर लिखा। हम अपने बारे में क्या सोचते हैं, इसका असर हमारे फैसलों और आत्मविश्वास पर पड़ सकता है—उनका काम इसी विचार की पड़ताल करता है। उनकी किताबें लक्ष्य तय करने और स्थायी व्यक्तिगत बदलाव पर सोचने में मदद करती हैं।',
  },
  'robert greene': {
    en: 'Robert Greene is an American author who studies strategy, influence, and human behavior through historical examples. His books draw on stories from politics, culture, and leadership to examine how people use power. Readers often turn to his work to consider ambition, decision-making, and social dynamics.',
    kn: 'ರಾಬರ್ಟ್ ಗ್ರೀನ್ ಇತಿಹಾಸದ ಉದಾಹರಣೆಗಳ ಮೂಲಕ ತಂತ್ರ, ಪ್ರಭಾವ ಮತ್ತು ಮಾನವ ನಡವಳಿಕೆಯನ್ನು ಪರಿಶೀಲಿಸುವ ಅಮೆರಿಕದ ಲೇಖಕರು. ರಾಜಕೀಯ, ಸಂಸ್ಕೃತಿ ಮತ್ತು ನಾಯಕತ್ವದ ಕಥೆಗಳ ಆಧಾರದಲ್ಲಿ ಅಧಿಕಾರವನ್ನು ಜನರು ಹೇಗೆ ಬಳಸುತ್ತಾರೆ ಎಂಬುದನ್ನು ಅವರ ಪುಸ್ತಕಗಳು ಚರ್ಚಿಸುತ್ತವೆ. ಮಹತ್ವಾಕಾಂಕ್ಷೆ, ನಿರ್ಧಾರ ಮತ್ತು ಸಾಮಾಜಿಕ ಸಂಬಂಧಗಳ ಬಗ್ಗೆ ಓದುಗರನ್ನು ಚಿಂತಿಸಲು ಅವರ ಕೃತಿಗಳು ಪ್ರೇರೇಪಿಸುತ್ತವೆ.',
    hi: 'रॉबर्ट ग्रीन अमेरिकी लेखक हैं, जो इतिहास के उदाहरणों के ज़रिए रणनीति, प्रभाव और मानव व्यवहार का अध्ययन करते हैं। उनकी किताबें राजनीति, संस्कृति और नेतृत्व की कहानियों से यह देखती हैं कि लोग शक्ति का उपयोग कैसे करते हैं। उनका काम महत्वाकांक्षा, फैसलों और सामाजिक संबंधों पर विचार करने का अवसर देता है।',
  },
  'rhonda byrne': {
    en: 'Rhonda Byrne is an Australian author and producer whose books focus on positive thinking and personal aspirations. Her writing asks readers to notice the ideas and expectations they bring to everyday life. Many people read her work as an invitation to reflect on hope, gratitude, and personal goals.',
    kn: 'ರೋಂಡಾ ಬೈರ್ನ್ ಆಸ್ಟ್ರೇಲಿಯಾದ ಲೇಖಕಿ ಮತ್ತು ನಿರ್ಮಾಪಕಿ; ಅವರ ಪುಸ್ತಕಗಳು ಸಕಾರಾತ್ಮಕ ಚಿಂತನೆ ಮತ್ತು ವೈಯಕ್ತಿಕ ಗುರಿಗಳ ಬಗ್ಗೆ ಇವೆ. ದೈನಂದಿನ ಜೀವನಕ್ಕೆ ನಾವು ಯಾವ ಆಲೋಚನೆಗಳು ಮತ್ತು ನಿರೀಕ್ಷೆಗಳನ್ನು ತರುತ್ತೇವೆ ಎಂದು ಗಮನಿಸಲು ಅವರ ಬರಹಗಳು ಆಹ್ವಾನಿಸುತ್ತವೆ. ಆಶೆ, ಕೃತಜ್ಞತೆ ಮತ್ತು ಗುರಿಗಳ ಬಗ್ಗೆ ಚಿಂತಿಸಲು ಅನೇಕ ಓದುಗರು ಅವರ ಕೃತಿಗಳನ್ನು ಓದುತ್ತಾರೆ.',
    hi: 'रोंडा बर्न ऑस्ट्रेलियाई लेखिका और निर्माता हैं। उनकी किताबें सकारात्मक सोच और व्यक्तिगत आकांक्षाओं पर केंद्रित हैं। वे पाठकों को रोज़मर्रा के जीवन में अपने विचारों और अपेक्षाओं पर ध्यान देने के लिए आमंत्रित करती हैं और आशा, कृतज्ञता तथा लक्ष्यों पर सोचने का अवसर देती हैं।',
  },
  'walter isaacson': {
    en: 'Walter Isaacson is an American biographer, journalist, and former editor known for carefully researched life stories. His biographies combine personal details with the ideas, work, and historical settings that shaped their subjects. His writing helps readers see how individual lives connect with larger changes in science and society.',
    kn: 'ವಾಲ್ಟರ್ ಐಸಾಕ್‌ಸನ್ ಅಮೆರಿಕದ ಜೀವನಚರಿತ್ರೆಕಾರ ಮತ್ತು ಪತ್ರಕರ್ತರು; ಸಂಶೋಧನಾಧಾರಿತ ಜೀವನಕಥೆಗಳಿಗೆ ಅವರು ಪರಿಚಿತರಾಗಿದ್ದಾರೆ. ವ್ಯಕ್ತಿಯ ವೈಯಕ್ತಿಕ ಜೀವನದ ಜೊತೆಗೆ ಅವರ ಆಲೋಚನೆಗಳು, ಕೆಲಸ ಮತ್ತು ಕಾಲದ ಹಿನ್ನೆಲೆಯನ್ನೂ ಅವರ ಪುಸ್ತಕಗಳು ಜೋಡಿಸುತ್ತವೆ. ವಿಜ್ಞಾನ ಮತ್ತು ಸಮಾಜದ ದೊಡ್ಡ ಬದಲಾವಣೆಗಳೊಂದಿಗೆ ವ್ಯಕ್ತಿಗಳ ಜೀವನ ಹೇಗೆ ಬೆಸೆದುಕೊಳ್ಳುತ್ತದೆ ಎಂಬುದನ್ನು ಅವರ ಬರಹಗಳು ತೋರಿಸುತ್ತವೆ.',
    hi: 'वॉल्टर आइज़ैकसन अमेरिकी जीवनीकार और पत्रकार हैं, जो गहराई से शोध की गई जीवन-कथाओं के लिए जाने जाते हैं। उनकी किताबें व्यक्ति के निजी जीवन को उसके विचारों, काम और ऐतिहासिक दौर से जोड़ती हैं। उनका लेखन दिखाता है कि व्यक्तिगत जीवन विज्ञान और समाज के बड़े बदलावों से कैसे जुड़ते हैं।',
  },
  'robin sharma': {
    en: 'Robin Sharma is a Canadian writer and speaker whose books explore leadership and personal habits. He presents practical ideas about discipline, purpose, and making thoughtful use of everyday time. His work is read by people looking for encouragement to build meaningful routines and lead with care.',
    kn: 'ರಾಬಿನ್ ಶರ್ಮಾ ಕೆನಡಾದ ಲೇಖಕ ಮತ್ತು ಭಾಷಣಕಾರರು; ನಾಯಕತ್ವ ಮತ್ತು ವೈಯಕ್ತಿಕ ಅಭ್ಯಾಸಗಳು ಅವರ ಪುಸ್ತಕಗಳ ಪ್ರಮುಖ ವಿಷಯಗಳು. ಶಿಸ್ತು, ಉದ್ದೇಶ ಮತ್ತು ದೈನಂದಿನ ಸಮಯವನ್ನು ಅರ್ಥಪೂರ್ಣವಾಗಿ ಬಳಸುವ ಬಗ್ಗೆ ಅವರು ಪ್ರಾಯೋಗಿಕ ಆಲೋಚನೆಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳುತ್ತಾರೆ. ಉತ್ತಮ ದಿನಚರಿ ರೂಪಿಸಿ ಜವಾಬ್ದಾರಿಯಿಂದ ಮುನ್ನಡೆಸಲು ಅವರ ಬರಹಗಳು ಪ್ರೇರಣೆ ನೀಡುತ್ತವೆ.',
    hi: 'रॉबिन शर्मा कनाडाई लेखक और वक्ता हैं। उनकी किताबें नेतृत्व और व्यक्तिगत आदतों पर केंद्रित हैं। वे अनुशासन, उद्देश्य और रोज़ के समय का सार्थक उपयोग करने के व्यावहारिक विचार साझा करते हैं, ताकि पाठक उपयोगी दिनचर्या बना सकें और संवेदनशील नेतृत्व कर सकें।',
  },
  'ankur warikoo': {
    en: 'Ankur Warikoo is an Indian entrepreneur, educator, and author who shares practical lessons from work and life. His writing often discusses careers, money, habits, and the decisions people make while growing. He communicates in a direct, approachable style that encourages readers to learn from experience and take deliberate steps forward.',
    kn: 'ಅಂಕುರ್ ವಾರಿಕೂ ಭಾರತೀಯ ಉದ್ಯಮಿ, ಶಿಕ್ಷಣತಜ್ಞ ಮತ್ತು ಲೇಖಕರು; ಕೆಲಸ ಹಾಗೂ ಜೀವನದ ಅನುಭವಗಳಿಂದ ಪಡೆದ ಪ್ರಾಯೋಗಿಕ ಪಾಠಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳುತ್ತಾರೆ. ವೃತ್ತಿ, ಹಣ, ಅಭ್ಯಾಸಗಳು ಮತ್ತು ಬೆಳೆಯುವಾಗ ನಾವು ಮಾಡುವ ನಿರ್ಧಾರಗಳು ಅವರ ಬರಹಗಳ ವಿಷಯಗಳಾಗಿವೆ. ನೇರ ಮತ್ತು ಸರಳ ಶೈಲಿಯಲ್ಲಿ ಬರೆಯುವ ಅವರು ಅನುಭವದಿಂದ ಕಲಿತು ಉದ್ದೇಶಪೂರ್ವಕವಾಗಿ ಮುಂದುವರಿಯಲು ಪ್ರೇರೇಪಿಸುತ್ತಾರೆ.',
    hi: 'अंकुर वारिकू भारतीय उद्यमी, शिक्षक और लेखक हैं। वे काम और जीवन के अनुभवों से मिले व्यावहारिक सबक साझा करते हैं। उनके लेखन में करियर, पैसे, आदतों और आगे बढ़ते समय लिए जाने वाले फैसलों पर चर्चा होती है। उनकी सहज और सीधी शैली पाठकों को अनुभव से सीखकर सोच-समझकर कदम बढ़ाने के लिए प्रेरित करती है।',
  },
};

function normalize(value: string) {
  return value.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

function getAuthorNote(author: string, language: SiteLanguage) {
  const name = normalize(author);
  const match = Object.entries(authorBios).find(([key]) => name.includes(key));
  return match?.[1][language] ?? ({
    en: 'Explore this author’s ideas and stories through the titles available at Jnana Nidhi. Each book offers its own perspective and a new way to think about the world.',
    kn: 'ಜ್ಞಾನ ನಿಧಿಯಲ್ಲಿ ಲಭ್ಯವಿರುವ ಪುಸ್ತಕಗಳ ಮೂಲಕ ಈ ಲೇಖಕರ ಆಲೋಚನೆಗಳು ಮತ್ತು ಕಥೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ. ಪ್ರತಿಯೊಂದು ಪುಸ್ತಕವೂ ತನ್ನದೇ ದೃಷ್ಟಿಕೋನ ಮತ್ತು ಜಗತ್ತನ್ನು ಹೊಸದಾಗಿ ನೋಡುವ ಅವಕಾಶ ನೀಡುತ್ತದೆ.',
    hi: 'ज्ञान निधि में उपलब्ध किताबों के ज़रिए इस लेखक के विचारों और कहानियों को जानें। हर किताब अपना अलग नज़रिया और दुनिया को नए ढंग से देखने का अवसर देती है।',
  })[language];
}

export function AuthorsView() {
  const { language, t } = useLanguage();
  const [books, setBooks] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch('/products')
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load authors');
        return response.json() as Promise<BookApiRecord[]>;
      })
      .then((records) => {
        if (active && Array.isArray(records)) setBooks(records.map(toBookProduct));
      })
      .catch((loadError) => {
        if (active) {
          console.error('Author catalog load error:', loadError);
          setError(true);
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const authors = useMemo(() => {
    const groups = new Map<string, { name: string; books: Product[] }>();
    books.forEach((book) => {
      const name = book.author?.trim();
      if (!name) return;
      const key = normalize(name);
      const group = groups.get(key);
      if (group) group.books.push(book);
      else groups.set(key, { name, books: [book] });
    });
    return [...groups.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((author) => normalize(author.name).includes(normalize(query)));
  }, [books, query]);

  return (
    <section className="bv-cosmic-page mx-auto max-w-7xl rounded-3xl p-5 sm:p-8 lg:p-10">
      <header className="bv-cosmic-page-heading mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm font-semibold text-violet-800">
          <BookOpen className="h-4 w-4" /> {t('Meet the authors')}
        </span>
        <h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">{t('Stories begin with their authors')}</h1>
        <p className="mt-3 text-base leading-7 sm:text-lg">{t('Discover the writers and thinkers behind the books on our shelves.')}</p>
      </header>

      <label className="mx-auto mt-8 flex max-w-xl items-center gap-3 rounded-2xl border border-violet-200 bg-white/90 px-4 py-3 shadow-sm">
        <Search className="h-5 w-5 shrink-0 text-violet-600" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('Search authors…')}
          className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-500"
        />
      </label>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20 text-violet-900"><Loader2 className="h-5 w-5 animate-spin" /> {t('Loading authors…')}</div>
      ) : error ? (
        <div role="status" className="mx-auto mt-10 max-w-xl rounded-2xl border border-pink-200 bg-pink-50 p-6 text-center text-sm font-medium text-fuchsia-950">
          {t('We couldn’t load the author list right now. Please try again in a moment.')}
        </div>
      ) : authors.length === 0 ? (
        <div className="py-16 text-center text-sm font-medium text-ink-700">{t('No authors found. Try another name.')}</div>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {authors.map(({ name, books: authorBooks }) => {
            const portrait = getAuthorPortraitUrl(name);
            const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
            return (
              <article key={normalize(name)} className="card overflow-hidden rounded-3xl border border-violet-200/70 bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-6">
                <div className="flex items-center gap-4">
                  {portrait ? (
                    <img src={portrait} alt={`${name} portrait`} loading="lazy" className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-sm" />
                  ) : (
                    <div aria-label={`${name} portrait unavailable`} className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-200 via-pink-200 to-rose-200 text-xl font-bold text-violet-950">
                      {initials || <UserRound className="h-8 w-8" />}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-bold text-violet-950">{name}</h2>
                    <p className="mt-1 text-sm font-semibold text-fuchsia-800">{authorBooks.length} {t(authorBooks.length === 1 ? 'book in our catalog' : 'books in our catalog')}</p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-ink-700">{getAuthorNote(name, language)}</p>
                <div className="mt-4 border-t border-violet-100 pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-violet-800">{t('Available titles')}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {authorBooks.slice(0, 4).map((book) => <li key={book.id} className="flex items-start gap-2 text-sm font-medium text-ink-800"><BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-700" /><span>{book.name}</span></li>)}
                    {authorBooks.length > 4 && <li className="pl-6 text-xs font-semibold text-ink-600">{t('and')} {authorBooks.length - 4} {t('more')}</li>}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

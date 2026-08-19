// =========================================================================
// ⚖️ ทนายชาวบ้าน AI (Elderly-Friendly Legal Assistant)
// =========================================================================

const API_KEY = "XlsPD6JNJpArGLwlroRnqoL2zLeZcIod"; // <--- อย่าลืมใส่ API Key นะครับ

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('⚖️ ทนายชาวบ้าน AI')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1'); 
}

function analyzeDocument(docType, text) {
  const url = "http://thaillm.or.th/api/v1/chat/completions";
  
  // =========================================================================
  // 🛡️ Agent 1: "ด่านตรวจ" (คัดกรองหมวดหมู่)
  // =========================================================================
  const guardPrompt = `คุณคือระบบรักษาความปลอดภัย (Logic Gate)
หน้าที่ของคุณคือตรวจสอบข้อความว่า "เกี่ยวข้อง" กับหมวดหมู่: "${docType}" หรือไม่
คุณต้องตอบกลับด้วยคำศัพท์ในวงเล็บก้ามปูเท่านั้น ห้ามอธิบาย!

[กฎการตัดสินใจเด็ดขาด]:
- [NOT_LEGAL] = ข้อความแชท, ข่าว, เพลง, บ่นเรื่องส่วนตัว (ไม่มีผลทางกฎหมาย)
- [MISMATCH] = เป็นเอกสาร แต่ "ผิดประเภท" ชัดเจน (เช่น เลือกสัญญากู้ยืม แต่ใส่พินัยกรรม)
- [PASS] = ข้อความตรงกับประเภท "${docType}" (กฎเหล็ก: แม้สัญญาจะผิดกฎหมายหรือเอาเปรียบ ให้ตอบ PASS เสมอ เพื่อส่งให้ทนายวิเคราะห์)

--- ตัวอย่าง (Training Data) ---
ประเภท: สัญญากู้ยืมเงิน
ข้อความ: ผู้กู้ตกลงกู้ยืมเงิน 50,000 บาท ดอกร้อยละ 15 ต่อปี
คำตอบ: [PASS]

ประเภท: สัญญากู้ยืมเงิน
ข้อความ: กู้ 100,000 ดอก 5% ต่อเดือน ไม่จ่ายยึดทรัพย์ทันที
คำตอบ: [PASS]

ประเภท: สัญญากู้ยืมเงิน
ข้อความ: ให้เช่าที่ดินแปลงนี้ 3 ปี เดือนละ 10,000 บาท
คำตอบ: [MISMATCH]

ประเภท: เอกสารราชการ
ข้อความ: วันนี้ปวดหัวจัง อยากกินยา
คำตอบ: [NOT_LEGAL]
------------------------------------`;

  const guardPayload = {
    "model": "typhoon-s-thaillm-8b-instruct",
    "messages": [
      {"role": "system", "content": guardPrompt},
      {"role": "user", "content": `ประเภทที่เลือก: ${docType}\nข้อความ: ${text}`}
    ],
    "max_tokens": 10, 
    "temperature": 0.0 
  };

  try {
    const responseGuard = UrlFetchApp.fetch(url, {
      "method": "post",
      "contentType": "application/json",
      "headers": { "Authorization": "Bearer " + API_KEY },
      "payload": JSON.stringify(guardPayload),
      "muteHttpExceptions": true
    });
    
    const responseText = responseGuard.getContentText();
    let jsonGuard;
    
    try {
      jsonGuard = JSON.parse(responseText);
    } catch (parseError) {
      return "[ERROR_API_DOWN]"; 
    }

    if (jsonGuard.choices && jsonGuard.choices.length > 0) {
       let guardResult = jsonGuard.choices[0].message.content.toUpperCase();
       if (guardResult.includes("[NOT_LEGAL]")) return "[ERROR_NOT_LEGAL]";
       if (guardResult.includes("[MISMATCH]")) return "[ERROR_MISMATCH]";
       if (!guardResult.includes("[PASS]")) return "[ERROR_MISMATCH]"; 
    } else {
       return "[ERROR_API_DOWN]"; 
    }
  } catch (e) {
    return "[ERROR_API_DOWN]";
  }

  // =========================================================================
  // 👨‍⚖️ Agent 2: "ทนายความ" (อัปเกรด: เพิ่มการอ้างอิงมาตรากฎหมายแบบเข้าใจง่าย)
  // =========================================================================
  const lawyerPrompt = `คุณคือ 'ทนายชาวบ้าน AI' หน้าที่ของคุณคือแปลข้อความกฎหมายให้ 'ผู้สูงอายุ' ฟัง
กฎเหล็ก: ต้องตอบให้ "สั้น กระชับ เข้าใจง่าย" ใช้ภาษาพูดเหมือนลูกหลานเล่าให้ฟัง บังคับตอบตาม 5 ข้อนี้เท่านั้น (ข้อละไม่เกิน 3-4 บรรทัด):

1. ⚖️ ฟันธงความถูกต้อง: (บอกสั้นๆ ไปเลยว่า "✅ สัญญานี้ปลอดภัยทำได้" หรือ "🚨 สัญญานี้ผิดกฎหมาย/โดนเอาเปรียบ" เพราะอะไรสั้นๆ)
2. 📝 สรุปง่ายๆ: (ใคร ต้องทำอะไร จ่ายเท่าไหร่ อธิบายแบบบ้านๆ)
3. ✅ คำแนะนำ: (คุณตาคุณยายควรทำยังไงต่อไป เพื่อรักษาสิทธิของตนเอง)
4. ❌ ห้ามทำเด็ดขาด: (เตือนสติ เช่น ห้ามเซ็น, ห้ามโอนเงินก่อน, ระวังโดนยึดทรัพย์)
5. 📖 กฎหมายอ้างอิง: (ระบุ "ชื่อและมาตรากฎหมาย" ที่เกี่ยวข้อง และอธิบายความหมายของมาตรานั้นสั้นๆ ให้ชาวบ้านเข้าใจง่าย ว่ากฎหมายคุ้มครองเรื่องนี้อย่างไร)

(ตัวอย่างข้อ 5: 📖 กฎหมายอ้างอิง: ตามประมวลกฎหมายแพ่งและพาณิชย์ มาตรา 654 ห้ามคิดดอกเบี้ยเกินร้อยละ 15 ต่อปี หากคิดเกินกว่านั้น ดอกเบี้ยจะเป็นโมฆะทั้งหมด คือไม่ต้องจ่ายดอกเบี้ยเลยแม้แต่บาทเดียวครับ)`;

  const lawyerPayload = {
    "model": "typhoon-s-thaillm-8b-instruct",
    "messages": [
      {"role": "system", "content": lawyerPrompt},
      {"role": "user", "content": `ช่วยวิเคราะห์สัญญานี้ให้หน่อย เอาสั้นๆ เข้าใจง่ายๆ พร้อมยกกฎหมายมาอ้างอิงด้วย: ${text}`}
    ],
    "max_tokens": 1000, 
    "temperature": 0.25
  };

  try {
    const responseLawyer = UrlFetchApp.fetch(url, {
      "method": "post",
      "contentType": "application/json",
      "headers": { "Authorization": "Bearer " + API_KEY },
      "payload": JSON.stringify(lawyerPayload),
      "muteHttpExceptions": true
    });
    
    const responseText = responseLawyer.getContentText();
    let jsonLawyer;

    try {
      jsonLawyer = JSON.parse(responseText);
    } catch (parseError) {
      return "⚠️ ขออภัยครับ ขณะนี้เซิร์ฟเวอร์หลัก (ThaiLLM) มีผู้ใช้งานเยอะ กรุณารอสักครู่แล้วกดวิเคราะห์ใหม่อีกครั้งครับ";
    }

    if (jsonLawyer.choices && jsonLawyer.choices.length > 0) {
      return jsonLawyer.choices[0].message.content;
    } else {
      return "⚠️ ขออภัยครับ เซิร์ฟเวอร์ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง";
    }
  } catch (e) {
    return "เกิดข้อผิดพลาด: " + e.toString();
  }
}
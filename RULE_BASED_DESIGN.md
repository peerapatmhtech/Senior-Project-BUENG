# การออกแบบระบบโดยใช้ Rule-Based System

## ภาพรวม

โปรเจกต์นี้นำหลักการ **Rule-Based System** มาใช้เป็นกลไกหลักในการแนะนำกิจกรรม (Event Recommendation) และการจับคู่ผู้ใช้งาน (User Matching) โดยออกแบบระบบให้ตัดสินใจและดำเนินการตามชุดกฎ (Rules) ที่กำหนดไว้อย่างชัดเจน ซึ่งทำงานเป็นขั้นตอนตามลำดับ (Sequential Pipeline) แทนการใช้โมเดล Machine Learning โดยตรง

---

## Rule-Based Pipeline: การค้นหาและแนะนำกิจกรรม

เมื่อผู้ใช้งานบันทึกความสนใจ (Genres/SubGenres) ระบบจะผ่านกระบวนการ Rule-Based ทั้งหมด **8 ขั้นตอน** ดังแผนภาพด้านล่าง

```mermaid
flowchart TD
    A([ผู้ใช้บันทึกความสนใจ]) --> B

    subgraph PIPELINE["Rule-Based Pipeline (genreService.js)"]
        B["Rule 1: ตรวจสอบความถูกต้องของอีเมล\n(User Validation)"]
        B --> C["Rule 2: อัปเดต Preferences ของผู้ใช้\n(Update Filter Collection)"]
        C --> D["Rule 3: ยกเว้นกิจกรรมที่แมทช์แล้ว\n(Exclude Matched Events)"]
        D --> E["Rule 4: ตรวจสอบและแปลง SubGenres\n(Validate & Parse Subgenres)"]
        E --> F["Rule 5: ค้นหาแบบขนานใน Database\n(Parallel DB Search)"]
        F --> G["Rule 6: ตัดกิจกรรมซ้ำออก\n(Deduplication)"]
        G --> H{"มี SubGenre\nที่ยังหากิจกรรมไม่พบ?"}
        H -- "ใช่" --> I["Rule 7: ค้นหาจาก SerpApi (External)\n(Fallback to SerpApi)"]
        H -- "ไม่" --> J
        I --> J["Rule 8: บันทึกกิจกรรมที่แนะนำลงในระบบ\n(Auto-Save Recommendations)"]
    end

    J --> K([ส่งผลลัพธ์กลับสู่ผู้ใช้])
```

---

## รายละเอียดแต่ละกฎ (Rule Definition)

### Rule 1: ตรวจสอบสิทธิ์ผู้ใช้งาน (User Validation Rule)

> **เงื่อนไข (Condition):** ผู้ใช้งานต้องมีบัญชีอยู่จริงในระบบ
> **การกระทำ (Action):** หากไม่พบอีเมลใน Collection `Gmail` ระบบจะหยุดทำงานทันทีและโยน Error `USER_NOT_FOUND`

```mermaid
flowchart LR
    A([รับ email จาก Request]) --> B{"email พบใน\nGmail Collection?"}
    B -- ใช่ --> C([ผ่าน → ไปยัง Rule 2])
    B -- ไม่ --> D([หยุดทำงาน\nThrow Error: USER_NOT_FOUND])
```

---

### Rule 2: อัปเดตความสนใจของผู้ใช้ (Preference Update Rule)

> **เงื่อนไข (Condition):** ผู้ใช้งานส่ง Genres และ SubGenres มาใหม่
> **การกระทำ (Action):** ระบบบันทึกทับข้อมูลเดิมใน Collection `Filter` หรือสร้างใหม่หากยังไม่มี (Upsert)

```mermaid
flowchart LR
    A([รับ genres และ subGenres]) --> B{"มี Filter Record\nของ email นี้อยู่แล้ว?"}
    B -- ใช่ --> C[UPDATE ข้อมูลเดิม]
    B -- ไม่ --> D[INSERT Record ใหม่]
    C --> E([ผ่าน → ไปยัง Rule 3])
    D --> E
```

---

### Rule 3: คัดกรองกิจกรรมที่ผ่านการจับคู่แล้ว (Already-Matched Exclusion Rule)

> **เงื่อนไข (Condition):** กิจกรรมใดที่ผู้ใช้คนนี้เคยเข้าสู่กระบวนการ Match ไปแล้ว
> **การกระทำ (Action):** นำ `eventId` เหล่านั้นมาเก็บไว้ใน Exclusion List เพื่อไม่ให้แสดงซ้ำ

```mermaid
flowchart LR
    A([เริ่มต้น]) --> B["ค้นหา InfoMatch\nที่มี email = currentUser"]
    B --> C{"พบ eventId\nที่เคย Match แล้ว?"}
    C -- ใช่ --> D[เพิ่ม eventId เข้า exclusionList]
    C -- ไม่ --> E
    D --> E([ผ่าน → ไปยัง Rule 4])
```

---

### Rule 4: ตรวจสอบโครงสร้าง SubGenres (SubGenres Structure Rule)

> **เงื่อนไข (Condition):** ข้อมูล SubGenres ต้องมีรูปแบบที่ถูกต้อง (Object หรือ Map)
> **การกระทำ (Action):** หากรูปแบบผิด ระบบหยุดทันทีและโยน Error `INVALID_SUBGENRES_STRUCTURE`

```mermaid
flowchart LR
    A([ตรวจสอบ subGenres]) --> B{"subGenres เป็น\nObject หรือ Map?"}
    B -- ใช่ --> C([ผ่าน → ไปยัง Rule 5])
    B -- ไม่ --> D([หยุดทำงาน\nThrow Error: INVALID_SUBGENRES_STRUCTURE])
```

---

### Rule 5: ค้นหากิจกรรมใน Database (Database Search Rule)

> **เงื่อนไข (Condition):** สำหรับแต่ละ SubGenre ที่ผู้ใช้เลือก
> **การกระทำ (Action):** ค้นหากิจกรรมที่ตรงกับ Genre นั้นใน Database พร้อมกัน (Parallel) โดยยกเว้นกิจกรรมของตัวเองและกิจกรรมที่ถูก Exclude ไปแล้ว จำกัดผลลัพธ์ 50 รายการ เรียงตามวันที่

```mermaid
flowchart TD
    A([วน Loop ทุก subGenre]) --> B["Query Event\n- email != currentUser\n- _id NOT IN exclusionList\n- genre.category IN subGenreList\nSORT date ASC, LIMIT 50"]
    B --> C{"พบกิจกรรม\nในฐานข้อมูล?"}
    C -- ใช่ --> D[เพิ่มผลลัพธ์เข้า allFoundEvents]
    C -- ไม่ --> E[เพิ่ม subGenre นี้เข้า missingSubGenres]
    D --> F([ผ่าน → ไปยัง Rule 6])
    E --> F
```

---

### Rule 6: ตัดข้อมูลซ้ำ (Deduplication Rule)

> **เงื่อนไข (Condition):** ผลลัพธ์จากการค้นหาหลาย SubGenre อาจมีกิจกรรมซ้ำกัน
> **การกระทำ (Action):** ใช้ `Map` เพื่อเก็บ `_id` ที่ไม่ซ้ำ และตรวจสอบซ้ำเพิ่มเติมด้วย `title` และ `link`

```mermaid
flowchart LR
    A([วน Loop ทุก event]) --> B{"_id, title หรือ link\nซ้ำกับที่มีอยู่แล้ว?"}
    B -- ใช่ --> C([ทิ้งกิจกรรมที่ซ้ำออก])
    B -- ไม่ --> D([เก็บเข้า uniqueFoundEvents])
    C --> E([ผ่าน → ไปยัง Rule 7])
    D --> E
```

---

### Rule 7: Fallback ไปยัง SerpApi (External Search Fallback Rule)

> **เงื่อนไข (Condition):** SubGenre ใดที่ค้นหาใน Database ไม่พบกิจกรรมเลย (missingSubGenres)
> **การกระทำ (Action):** ส่งคำสั่งค้นหาไปยัง SerpApi โดยจำกัด 3 คำค้นต่อ Category เพื่อป้องกัน Rate Limit จากนั้นบันทึกผลลัพธ์ที่ได้กลับเข้า Database อัตโนมัติ

```mermaid
flowchart TD
    A([มี missingSubGenres?]) --> B{"missingSubGenres\nมีข้อมูล?"}
    B -- ไม่ --> Z([ข้ามไปยัง Rule 8])
    B -- ใช่ --> C["สร้าง searchQuery:\nEvents for subGenre in Thailand"]
    C --> D["เรียก SerpApi.searchEvents()\nจำกัด 3 คำค้น/category"]
    D --> E{"พบกิจกรรมจาก\nSerpApi?"}
    E -- ใช่ --> F["บันทึกกิจกรรมใหม่\nลง Event Collection\n(createdByAI = true)"]
    E -- ไม่ --> Z
    F --> G[เพิ่มผลลัพธ์เข้า finalEvents]
    G --> Z
```

---

### Rule 8: บันทึกกิจกรรมแนะนำอัตโนมัติ (Auto-Save Recommendation Rule)

> **เงื่อนไข (Condition):** มีกิจกรรมที่ผ่านการกรองแล้วอยู่ในรายการผลลัพธ์
> **การกระทำ (Action):** บันทึก (`saveEventsFromSource`) แบบ Transaction เพื่อความปลอดภัยของข้อมูล โดยระบบจะสร้าง `Event` template ก่อน แล้วจึงผูกการเข้าถึงไว้กับผู้ใช้งานแต่ละคนในตาราง `UserEvent`

```mermaid
flowchart TD
    A([finalEvents มีข้อมูล?]) --> B{"finalEvents.length > 0?"}
    B -- ไม่ --> Z([จบกระบวนการ])
    B -- ใช่ --> C[BEGIN TRANSACTION]
    C --> D["วน Loop ทุก event\nใน finalEvents"]
    D --> E{"event มีอยู่ใน\nEvent Collection แล้ว?"}
    E -- ไม่ --> F[CREATE Event ใหม่]
    E -- ใช่ --> G
    F --> G{"UserEvent\n(email + eventId)\nมีอยู่แล้ว?"}
    G -- ไม่ --> H["CREATE UserEvent\n(status: active)"]
    G -- ใช่ --> D
    H --> D
    D -- วนครบทุก event --> I[COMMIT TRANSACTION]
    I --> Z
```

---

## สรุปภาพรวม Rule-Based Design

| ลำดับ | ชื่อกฎ               | Condition (เงื่อนไข)  | Action (การดำเนินการ)           |
| :---: | :------------------- | :-------------------- | :------------------------------ |
|   1   | User Validation      | ไม่พบอีเมลในระบบ      | หยุดทำงาน / ส่ง Error           |
|   2   | Preference Update    | ส่ง Genres มาใหม่     | อัปเดต / สร้าง Filter Record    |
|   3   | Exclude Matched      | กิจกรรมเคย Match แล้ว | เพิ่ม eventId เข้า Exclude List |
|   4   | SubGenres Validation | โครงสร้างผิดรูปแบบ    | หยุดทำงาน / ส่ง Error           |
|   5   | DB Search            | มี SubGenres ที่เลือก | ค้นหากิจกรรมใน Database แบบขนาน |
|   6   | Deduplication        | พบกิจกรรมซ้ำ          | ตัดรายการซ้ำออก                 |
|   7   | SerpApi Fallback     | ไม่พบกิจกรรมใน DB     | เรียก SerpApi และบันทึกผลลัพธ์  |
|   8   | Auto-Save            | มีกิจกรรมในผลลัพธ์    | บันทึกลง Event และ UserEvent    |

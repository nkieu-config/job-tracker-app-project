# Smart Job Application Tracker — แผนงานละเอียด (Build Plan)

> โปรเจกต์เรือธงสำหรับพอร์ต Full-Stack — เครื่องมือจัดการการสมัครงานของตัวคุณเอง ที่มี AI ช่วยวิเคราะห์ JD และปรับเรซูเม่

**เป้าหมายปลายทาง:** เว็บแอปที่ดีพลอยจริง ใช้งานได้ ที่คุณใช้ล่างานเองได้ และโชว์สกิล full-stack + AI ครบในตัวเดียว

---

## ภาพรวมสแต็ก (ตัดสินใจมาให้แล้ว)

| ชั้น | เลือกใช้ | เหตุผล |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | เป็น full-stack ในตัวเดียว (frontend + backend ผ่าน Route Handlers/Server Actions) ชิปไว และเป็นสแต็กที่ตลาดต้องการมากสุด |
| UI | **Tailwind CSS + shadcn/ui** | ทำ UI สวยเร็ว ไม่ต้องเขียน CSS เยอะ |
| Database | **PostgreSQL บน Neon** (ฟรี) + **Prisma** ORM | ฟรีพอสำหรับพอร์ต, รองรับ pgvector สำหรับ AI, มี database branching |
| Auth | **Better Auth** | default ที่แนะนำสำหรับโปรเจกต์ใหม่ปี 2026, TypeScript-native, เก็บ user ใน Postgres ของเราเอง ไม่ผูก vendor |
| AI (generation) | **Google Gemini (AI Studio) — Gemini 2.5 Flash** | ฟรี ไม่ต้องใช้บัตรเครดิต (1,500 คำขอ/วัน), รับ PDF ได้ในตัว, ทำงานบนแอปที่ดีพลอยได้ |
| AI (embeddings) | **Gemini Embedding** (768 มิติ) | ฟรีบน free tier เดียวกับ generation (จำกัด rate) — ใช้ provider เดียวจบ ไม่ต้องสมัครเพิ่ม |
| File storage | **Vercel Blob หรือ Supabase Storage** | เก็บไฟล์เรซูเม่ |
| Validation | **Zod** | ตรวจ input ของผู้ใช้และ output ของ AI |
| Test | **Vitest + Testing Library** (Playwright ออปชัน) | |
| Deploy / CI | **Vercel + GitHub Actions** | |

**ทางเลือกถ้าอยากเร็วกว่า:** ใช้ **Clerk** แทน Better Auth (ติดตั้งไวสุด มี UI สำเร็จ) หรือใช้ **Supabase** ทั้งก้อน (Postgres + auth + storage + pgvector รวมในที่เดียว)

**หมายเหตุ AI (ฟรีล้วน):** Gemini ฟรีและทำงานบนแอปที่ดีพลอยได้ ตอนนั่งพัฒนาถ้าอยากเลี่ยงการชน rate limit (1,500 คำขอ/วัน) ใช้ **Ollama** รันโมเดลในเครื่องฟรีได้ (เช่น `nomic-embed-text` สำหรับ embeddings) แล้วค่อยสลับเป็น Gemini ตอน deploy — เพราะโมเดลในเครื่องจะใช้บน production ไม่ได้

**หมายเหตุพอร์ตรวม:** โปรเจกต์นี้ใช้ Next.js เป็น backend ในตัว ซึ่งโชว์ทักษะ API ได้ ส่วนทักษะ **backend แบบแยก service** (สำคัญกับงานองค์กร/ธนาคารไทย) ให้ไปโชว์ในโปรเจกต์ Marketplace ด้วย NestJS/Spring Boot พอร์ตรวมจะได้ครอบคลุมทั้งสองแบบ

**ก่อนเริ่มควรพอมี:** JavaScript พื้นฐาน, React เบื้องต้น (component, props, state), และคำสั่ง Git พื้นฐาน ส่วนที่เหลือเรียนระหว่างทางได้

---

## เฟส 0 — Setup + ดีพลอยตั้งแต่วันแรก (สัปดาห์ 1)

> หลักการ: ดีพลอยให้ขึ้นจริงตั้งแต่วันแรก แล้วค่อยเพิ่มฟีเจอร์ จะได้ไม่เจอปัญหา deploy ตอนท้ายแบบกองพะเนิน

**ฟีเจอร์:** โครงโปรเจกต์ที่รันได้ + มี URL จริงบน Vercel (แค่หน้า "Hello")

**เทคโนโลยี:** Next.js, TypeScript, Tailwind, Git/GitHub, Vercel, Neon, Prisma

**ขั้นตอน:**
1. `npx create-next-app@latest` (เลือก TypeScript + Tailwind + App Router) แล้ว push ขึ้น GitHub repo ใหม่
2. เชื่อม repo กับ Vercel → ทุก push จะ deploy อัตโนมัติ ได้ URL จริงทันที
3. สมัคร Neon สร้าง Postgres ฟรี, ติดตั้ง Prisma, ตั้ง `DATABASE_URL` (ทั้งใน `.env` และใน Vercel environment variables)
4. เขียน `schema.prisma` เริ่มต้น แล้วรัน migration ครั้งแรก

**ต้องเรียนรู้:** โครงสร้าง App Router (`app/`, layout, page, route handlers), การตั้ง environment variables (และทำไมห้าม commit), Prisma schema + migration คืออะไร

---

## เฟส 1 — Auth + ระบบสมาชิก (สัปดาห์ 1)

**ฟีเจอร์:** สมัคร / ล็อกอิน, หน้าที่ต้องล็อกอินก่อนเข้า (protected), ข้อมูลทุกอย่างผูกกับผู้ใช้

**เทคโนโลยี:** Better Auth (เก็บ user/session ใน Postgres ผ่าน Prisma)

**ขั้นตอน:**
1. ติดตั้งและตั้งค่า Better Auth — เปิด email/password และ (ออปชัน) Google OAuth
2. เพิ่มตาราง user/session เข้า schema แล้ว migrate
3. ทำหน้า sign up / sign in และกันไม่ให้เข้า route ที่ต้องล็อกอิน
4. ดึง session ฝั่ง server เพื่อ scope ข้อมูลตาม `userId`

**ต้องเรียนรู้:** auth ทำงานยังไง (session vs JWT ต่างกันยังไง), การ hash รหัสผ่าน, การป้องกัน route

**บทเรียนความปลอดภัยสำคัญ:** อย่าพึ่ง middleware อย่างเดียวในการป้องกัน auth — มีช่องโหว่ (CVE-2025-29927) ที่ middleware ของ Next.js ถูก bypass ได้ด้วยการปลอม header **ต้องเช็ค session ในชั้น data/route handler ด้วยเสมอ** จุดนี้พูดในห้องสัมภาษณ์ได้ดีมาก เพราะแสดงว่าคุณคิดเรื่อง security เป็น

---

## เฟส 2 — Core CRUD: ตัวติดตามใบสมัคร (สัปดาห์ 2)

**ฟีเจอร์:** เพิ่ม/แก้/ลบ/ดู ใบสมัคร, เปลี่ยนสถานะ, ใส่ deadline, dashboard สรุป

**เทคโนโลยี:** Prisma models, Route Handlers / Server Actions, React forms, Zod

**ร่าง data model:**
```
User            { id, email, name, ... }
Application     { id, userId, company, role,
                  status (SAVED|APPLIED|INTERVIEW|OFFER|REJECTED),
                  jobDescription (text), jobUrl, deadline, notes, createdAt }
ResumeVersion   { id, userId, label, fileUrl, content (text), createdAt }
```

**ขั้นตอน:**
1. ออกแบบ schema (Application, ResumeVersion) แล้ว migrate
2. สร้าง API / Server Actions: create / read / update / delete (scope ด้วย `userId` ทุกครั้ง)
3. ทำฟอร์มเพิ่ม/แก้ และ validate ด้วย Zod
4. หน้า list (กรองตามสถานะได้) + หน้า detail
5. dashboard: นับจำนวนใบสมัครตามสถานะ, แสดงใบที่ใกล้ถึง deadline

**ต้องเรียนรู้:** การออกแบบ REST endpoint / Route Handler, การ validate input ด้วย Zod, การผูกข้อมูลกับ user (authorization เบื้องต้น), การออกแบบ schema และ relations, การจัดการ state ฝั่ง client เทียบกับ Server Components

---

## เฟส 3 — อัปโหลดเรซูเม่ + อ่านข้อความจาก PDF (สัปดาห์ 2–3)

**ฟีเจอร์:** อัปโหลดไฟล์เรซูเม่ (PDF), ดึงข้อความออกมาเก็บไว้, รองรับหลายเวอร์ชัน

**เทคโนโลยี:** file storage (Vercel Blob / Supabase Storage / S3-R2), ไลบรารี parse PDF (เช่น unpdf หรือ pdf-parse)

**ขั้นตอน:**
1. ทำระบบ upload — เก็บไฟล์ไป storage แล้วเก็บ URL ลง DB
2. parse PDF เป็น text แล้วเก็บลง `ResumeVersion.content`
3. หน้าแสดง / สลับเวอร์ชันเรซูเม่

**ต้องเรียนรู้:** การจัดการไฟล์และ upload, object storage คืออะไร, การ parse เอกสาร, การจัดการ async และ error ตอนประมวลผลไฟล์ (ไฟล์เสีย/ใหญ่เกินจะทำยังไง)

---

## เฟส 4 — AI #1: สกัดสกิลจาก JD + วิเคราะห์ช่องว่าง (สัปดาห์ 3)

**ฟีเจอร์:** วาง job description → AI คืนสกิลที่ต้องการเป็นโครงสร้าง → เทียบกับเรซูเม่/โปรไฟล์ → บอกว่าขาดสกิลอะไร

**เทคโนโลยี:** Gemini API (Gemini 2.5 Flash, ฟรี), Zod ตรวจ output, prompt ที่ออกแบบให้คืน JSON

**ขั้นตอน:**
1. สมัคร Google AI Studio รับ API key ฟรี (ไม่ต้องใช้บัตร), เก็บใน env เท่านั้น ห้าม commit, แล้วติดตั้ง SDK (`@google/genai`)
2. เขียน prompt ให้คืน JSON เช่น `{ requiredSkills, niceToHave, seniority, summary }`
3. parse และ validate ด้วย Zod (กัน output เพี้ยน — ขั้นนี้สำคัญมาก)
4. เทียบ `requiredSkills` กับสกิลในเรซูเม่ → แสดงสิ่งที่ขาด

**ต้องเรียนรู้:** การเรียก LLM API, prompt engineering (วิธีบังคับให้ได้ output แบบ structured), การ validate และจัดการ error/timeout ของ AI, และการจัดการ rate limit ของ free tier (เช่น โควตารายวันของ Gemini)

---

## เฟส 5 — AI #2: Embeddings + pgvector + ปรับ bullet เรซูเม่ (สัปดาห์ 3–4)

**ฟีเจอร์:** จับคู่/จัดอันดับงานที่ใกล้เคียงด้วย "ความหมาย" และ AI ช่วยเขียน bullet เรซูเม่ให้ตรงกับ JD (แสดงผลแบบ streaming)

**เทคโนโลยี:** Gemini Embedding (ฟรี, 768 มิติ), pgvector บน Neon, streaming response

**ขั้นตอน:**
1. เปิด extension `vector` บน Neon แล้วเพิ่มคอลัมน์ embedding (ตั้งเป็น `vector(768)` ให้ตรงกับมิติของ Gemini Embedding)
2. แปลงข้อความ JD / โปรไฟล์เป็นเวกเตอร์ (embed) แล้วเก็บลง DB
3. query หาความใกล้เคียงด้วย cosine similarity เพื่อจัดอันดับ/แนะนำงาน
4. ฟีเจอร์ปรับ bullet: ส่ง JD + ประสบการณ์เข้า Gemini → คืน bullet ที่ปรับแล้ว (สตรีมผลแบบ real-time เพื่อ UX ที่ดี)

**ต้องเรียนรู้:** embeddings และ vector คืออะไร, cosine similarity, การใช้ pgvector query, ความต่างระหว่างงาน "generation" กับ "embeddings", การทำ streaming UI

**หมายเหตุ:** ถ้าอยากลดความซับซ้อนในรอบแรก ข้ามเฟสนี้ไปก่อนแล้วกลับมาทำเป็น stretch ได้ — แต่ embeddings คือจุดที่ทำให้พอร์ตดูล้ำกว่าคนอื่นชัดเจน

---

## เฟส 6 — เก็บงาน, เทสต์, CI/CD, ปล่อยจริง (สัปดาห์ 4)

**ฟีเจอร์:** UI เรียบร้อย, มีเทสต์, มี CI, ดีพลอย production, README ครบ

**เทคโนโลยี:** Vitest + Testing Library (+ Playwright ออปชัน), ESLint/Prettier, GitHub Actions

**ขั้นตอน:**
1. เขียน unit test ฟังก์ชันสำคัญ (เช่น logic วิเคราะห์ช่องว่างสกิล) + integration test ของ API
2. ตั้ง GitHub Actions ให้รัน lint + test ทุก pull request
3. เก็บ loose ends: จัดการ error states, loading states, ทำให้ responsive
4. ดีพลอย production (Vercel + Neon) และตรวจ env ให้ครบ
5. เขียน README ตามเช็กลิสต์ด้านล่าง

**ต้องเรียนรู้:** การเขียนเทสต์ที่มีคุณค่า (ไม่ใช่เทสต์เอาจำนวน), CI คืออะไรและทำไมสำคัญ, การเตรียมแอปให้พร้อมโชว์

---

## เช็กลิสต์ README (ทำให้ครบทุกข้อ)

1. ชื่อ + 1 ประโยคว่าแก้ปัญหาอะไร
2. ลิงก์ live demo + GIF/ภาพหน้าจอการใช้งาน
3. Tech stack จัดกลุ่มตามหมวด (ไม่ใช่ลิสต์รวด)
4. ฟีเจอร์เด่น (โดยเฉพาะส่วน AI)
5. **"ความท้าทายที่เจอและวิธีแก้"** — ส่วนนี้สำคัญสุด โชว์วิธีคิด
6. วิธีรันในเครื่อง (setup instructions)

---

## กับดักที่พบบ่อย (ระวังไว้)

- **commit API key / DATABASE_URL ขึ้น GitHub** — ใส่ `.env` ใน `.gitignore` ตั้งแต่แรก
- **ลืม scope ข้อมูลตาม userId** — ผู้ใช้ A เห็นข้อมูลผู้ใช้ B ได้ = ช่องโหว่ร้ายแรง
- **พึ่ง middleware อย่างเดียวในการป้องกัน auth** (ดูบทเรียนเฟส 1)
- **ไม่ validate output ของ AI** — LLM คืน JSON เพี้ยนเมื่อไร แอปพังเมื่อนั้น ใช้ Zod เสมอ
- **ลืมทำ loading / error states** — แอปที่ค้างตอนรอ AI ดูไม่โปร

---

## Stretch goals (ทำเมื่อแกนหลักเสร็จ)

- ทำเป็น PWA ติดตั้งบนมือถือได้
- dashboard สถิติเชิงลึก (อัตราตอบรับ, เวลาเฉลี่ยแต่ละสถานะ)
- ดึง JD จาก URL อัตโนมัติ
- containerize ด้วย Docker + เพิ่ม monitoring (ยกโปรเจกต์นี้ขึ้นระดับ production ตามที่คู่มือแนะนำให้เลือก 1 ตัวทำ)

---

## พูดถึงโปรเจกต์นี้ในห้องสัมภาษณ์ยังไง

- **เรื่องเล่า:** "ผมสร้างตัวนี้ตอนล่างานจริง เพราะเบื่อจดใบสมัครใน Excel" — authentic และจำง่าย
- **การตัดสินใจ + tradeoff:** อธิบายได้ว่าทำไมเลือก Next.js full-stack, ทำไมเลือก Better Auth, ทำไมต้องใช้ embeddings provider แยกจาก Anthropic
- **บั๊กที่แก้:** เล่าปัญหาจริงที่เจอ (เช่น AI คืน JSON ไม่ตรง format แล้วแก้ด้วย Zod + retry)
- **เรื่อง security:** ยกบทเรียน middleware/CVE ขึ้นมา แสดงว่าคิดเรื่องความปลอดภัยเป็น

---

## สรุปไทม์ไลน์ (~4 สัปดาห์)

| สัปดาห์ | โฟกัส |
|---|---|
| 1 | เฟส 0–1: setup + deploy + auth |
| 2 | เฟส 2–3: CRUD ติดตามใบสมัคร + อัปโหลด/parse เรซูเม่ |
| 3 | เฟส 4–5: AI สกัดสกิล + embeddings/matching |
| 4 | เฟส 6: เทสต์ + CI/CD + polish + README + ปล่อยจริง |

ระหว่างทาง: เขียน README ทันทีที่ทำแต่ละเฟสเสร็จ (อย่ารอตอนท้าย) และฝึกโจทย์ DSA วันละนิดควบคู่ไปสำหรับสัมภาษณ์

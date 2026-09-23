import json, re, os
import pymupdf

def clean_noise(text):
    text = re.sub(r'TOPIK\s*제?\d*회?.*', '', text)
    text = re.sub(r'제\d+회\s*한국어능력시험.*', '', text)
    text = re.sub(r'Test\s*of\s*Proficiency\s*in\s*Korean.*', '', text, flags=re.I)
    text = re.sub(r'홀수형.*', '', text)
    text = re.sub(r'짝수형.*', '', text)
    text = re.sub(r'듣기\s*통합.*', '', text)
    text = re.sub(r'---PAGE \d+---', '', text)
    return text.strip()

def clean_opt(text):
    text = re.sub(r'^[①②③④1-4lI\.\s\)]+', '', text.strip())
    patterns = [
        r'---\s*PAGE\s*\d+\s*---',
        r'※\s*\[\s*\d+.*',
        r'Test\s*(?:of|ol|ca|df|d)\s*Pr.*',
        r'est\s*(?:df|ca)\s*Pr.*',
        r'제\s*\d+\s*회\s*한국어능력시험.*',
        r'TOPIK\s*.*',
        r'\n\s*(?:남자|여자)\s*:.*',
        r'\s+(?:남자|여자)\s*:.*',
        r'\n\s*\d+\.\s+.*',
        r'\s+\d+\s+※.*',
    ]
    for pat in patterns:
        m = re.search(pat, text, flags=re.I)
        if m:
            text = text[:m.start()]
    text = re.sub(r'\s+\d+\s*$', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def get_listening_prompt(q):
    if q <= 3: return "※ [1～3] 다음을 듣고 가장 알맞은 그림 또는 그래프를 고르십시오. (각 2점)"
    if q <= 8: return "※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)"
    if q <= 12: return "※ [9～12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 가장 알맞은 것을 고르십시오. (각 2점)"
    if q <= 16: return "※ [13～16] 다음을 듣고 내용과 일치하는 것을 고르십시오. (각 2점)"
    if q <= 20: return "※ [17～20] 다음 대화를 잘 듣고 남자의 중심 생각을 고르십시오. (각 2점)"
    if q == 21: return "※ [21～22] 다음을 듣고 물음에 답하십시오. (각 2점)\n21. 남자의 중심 생각으로 가장 알맞은 것을 고르십시오."
    if q == 22: return "※ [21～22] 다음을 듣고 물음에 답하십시오. (각 2점)\n22. 들은 내용으로 맞는 것을 고르십시오."
    if q == 23: return "※ [23～24] 다음을 듣고 물음에 답하십시오. (각 2점)\n23. 남자가 무엇을 하고 있는지 고르십시오."
    if q == 24: return "※ [23～24] 다음을 듣고 물음에 답하십시오. (각 2점)\n24. 들은 내용으로 맞는 것을 고르십시오."
    if q == 25: return "※ [25～26] 다음을 듣고 물음에 답하십시오. (각 2점)\n25. 남자의 중심 생각으로 가장 알맞은 것을 고르십시오."
    if q == 26: return "※ [25～26] 다음을 듣고 물음에 답하십시오. (각 2점)\n26. 들은 내용으로 맞는 것을 고르십시오."
    if q == 27: return "※ [27～28] 다음을 듣고 물음에 답하십시오. (각 2점)\n27. 남자가 여자에게 말하는 의도로 가장 알맞은 것을 고르십시오."
    if q == 28: return "※ [27～28] 다음을 듣고 물음에 답하십시오. (각 2점)\n28. 들은 내용으로 맞는 것을 고르십시오."
    if q == 29: return "※ [29～30] 다음을 듣고 물음에 답하십시오. (각 2점)\n29. 남자의 직업으로 가장 알맞은 것을 고르십시오."
    if q == 30: return "※ [29～30] 다음을 듣고 물음에 답하십시오. (각 2점)\n30. 들은 내용으로 맞는 것을 고르십시오."
    if q == 31: return "※ [31～32] 다음을 듣고 물음에 답하십시오. (각 2점)\n31. 남자의 생각으로 가장 알맞은 것을 고르십시오."
    if q == 32: return "※ [31～32] 다음을 듣고 물음에 답하십시오. (각 2점)\n32. 남자의 태도로 가장 알맞은 것을 고르십시오."
    if q == 33: return "※ [33～34] 다음을 듣고 물음에 답하십시오. (각 2점)\n33. 무엇에 대한 이야기인지 가장 알맞은 것을 고르십시오."
    if q == 34: return "※ [33～34] 다음을 듣고 물음에 답하십시오. (각 2점)\n34. 들은 내용으로 맞는 것을 고르십시오."
    if q == 35: return "※ [35～36] 다음을 듣고 물음에 답하십시오. (각 2점)\n35. 남자의 생각으로 가장 알맞은 것을 고르십시오."
    if q == 36: return "※ [35～36] 다음을 듣고 물음에 답하십시오. (각 2점)\n36. 들은 내용으로 맞는 것을 고르십시오."
    if q == 37: return "※ [37～38] 다음을 듣고 물음에 답하십시오. (각 2점)\n37. 어떤 이야기인지 가장 알맞은 것을 고르십시오."
    if q == 38: return "※ [37～38] 다음을 듣고 물음에 답하십시오. (각 2점)\n38. 들은 내용으로 맞는 것을 고르십시오."
    if q == 39: return "※ [39～40] 다음을 듣고 물음에 답하십시오. (각 2점)\n39. 이 이야기 앞에 나온 내용으로 가장 알맞은 것을 고르십시오."
    if q == 40: return "※ [39～40] 다음을 듣고 물음에 답하십시오. (각 2점)\n40. 들은 내용으로 맞는 것을 고르십시오."
    if q == 41: return "※ [41～42] 다음을 듣고 물음에 답하십시오. (각 2점)\n41. 무엇에 대한 강연인지 가장 알맞은 것을 고르십시오."
    if q == 42: return "※ [41～42] 다음을 듣고 물음에 답하십시오. (각 2점)\n42. 들은 내용으로 맞는 것을 고르십시오."
    if q == 43: return "※ [43～44] 다음을 듣고 물음에 답하십시오. (각 2점)\n43. 이야기 앞에 나온 내용으로 가장 알맞은 것을 고르십시오."
    if q == 44: return "※ [43～44] 다음을 듣고 물음에 답하십시오. (각 2점)\n44. 들은 내용으로 맞는 것을 고르십시오."
    if q == 45: return "※ [45～46] 다음을 듣고 물음에 답하십시오. (각 2점)\n45. 남자의 생각으로 가장 알맞은 것을 고르십시오."
    if q == 46: return "※ [45～46] 다음을 듣고 물음에 답하십시오. (각 2점)\n46. 들은 내용으로 맞는 것을 고르십시오."
    if q == 47: return "※ [47～48] 다음을 듣고 물음에 답하십시오. (각 2점)\n47. 남자의 태도로 가장 알맞은 것을 고르십시오."
    if q == 48: return "※ [47～48] 다음을 듣고 물음에 답하십시오. (각 2점)\n48. 들은 내용으로 맞는 것을 고르십시오."
    if q == 49: return "※ [49～50] 다음을 듣고 물음에 답하십시오. (각 2점)\n49. 어떤 이야기인지 가장 알맞은 것을 고르십시오."
    return "※ [49～50] 다음을 듣고 물음에 답하십시오. (각 2점)\n50. 들은 내용으로 맞는 것을 고르십시오."

def build_listening(round_num):
    print(f"Building {round_num} listening...")
    with open(f'content/topik2-{round_num}/answers.json') as f:
        answers = json.load(f)['listening']
        
    if round_num == 83:
        doc = pymupdf.open('topik_data/topik2-83/83회_문제지_TOPIK2_1교시_듣기 통합.pdf')
        raw_text = '\n'.join(page.get_text() for page in doc)
    else:
        with open('content/topik2-102/listening-ocr.txt') as f:
            raw_text = f.read()
        # Fix Q1 marker in 102
        if not re.search(r'(?:^|\n)\s*1\.\s*', raw_text):
            raw_text = raw_text.replace('남자 : 이 책을 소포로 보내고', '1.\n남자 : 이 책을 소포로 보내고')

    # Split by questions
    positions = []
    for q in range(1, 51):
        m = re.search(rf'(?:^|\n)\s*{q}\.\s*', raw_text)
        if m: positions.append((q, m.start()))
    positions.sort(key=lambda x: x[1])
    
    questions = []
    for i in range(len(positions)):
        q, start = positions[i]
        end = positions[i+1][1] if i + 1 < len(positions) else len(raw_text)
        chunk = raw_text[start:end]
        
        prompt = get_listening_prompt(q)
        ans = answers[q - 1]
        audio = f"/test/audio/topik2-{round_num}/listening-q{q:02d}.mp3"
        
        if q <= 3:
            img = f"/test/photos/mock-exams/topik2-{round_num}/q{q:02d}.png"
            opts = ["①", "②", "③", "④"]
            script = re.sub(rf'^\s*{q}\.\s*', '', chunk.split('①')[0]).strip()
            script = clean_noise(script)
        else:
            img = None
            opt_start_match = re.search(r'[①1lI]\s*', chunk)
            if opt_start_match:
                script = clean_noise(chunk[:opt_start_match.start()])
                script = re.sub(rf'^\s*{q}\.\s*', '', script).strip()
                opt_chunk = chunk[opt_start_match.start():]
            else:
                script = ""
                opt_chunk = chunk
                
            opts = []
            for o_idx in range(1, 5):
                m1 = ['①', '②', '③', '④'][o_idx - 1]
                m2 = ['②', '③', '④', None][o_idx - 1]
                if m2:
                    p = re.search(rf'{m1}\s*(.*?)(?={m2})', opt_chunk, re.DOTALL)
                else:
                    p = re.search(rf'{m1}\s*(.*?)(?:\n\s*\d+\.|\Z)', opt_chunk, re.DOTALL)
                val = p.group(1).strip() if p else ''
                val = clean_opt(val)
                val = re.sub(r'\s+', ' ', val).strip()
                opts.append(val)
                
            for idx in range(4):
                if not opts[idx]: opts[idx] = f"보기 {idx+1}"
                
        explanation = f"[듣기 대본]\n{script}\n\n[정답 해설] 정답은 {ans}번입니다." if script else f"[정답 해설] 정답은 {ans}번입니다."
        questions.append({
            "question_number": q,
            "section": "listening",
            "prompt": prompt,
            "question_text": None,
            "passage": None, # Script never displayed during exam!
            "options": opts,
            "correct_answer": ans,
            "explanation": explanation,
            "audio_url": audio,
            "image_url": img
        })
        
    out_file = f'content/topik2-{round_num}/listening-exam.json'
    with open(out_file, 'w', encoding='utf8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"Saved {out_file}: {len(questions)} questions")
    return questions

def get_reading_header(q):
    if q in [1, 2]: return "※ [1～2] (    )에 들어갈 말로 가장 알맞은 것을 고르십시오. (각 2점)"
    if q in [3, 4]: return "※ [3～4] 밑줄 친 부분과 의미가 가장 비슷한 것을 고르십시오. (각 2점)"
    if q in range(5, 9): return "※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)"
    if q in range(9, 13): return "※ [9～12] 다음 글 또는 그래프의 내용과 같은 것을 고르십시오. (각 2점)"
    if q in range(13, 16): return "※ [13～15] 다음을 순서에 맞게 배열한 것을 고르십시오. (각 2점)"
    if q in range(16, 19): return "※ [16～18] (    )에 들어갈 말로 가장 알맞은 것을 고르십시오. (각 2점)"
    if q in [19, 20]: return "※ [19～20] 다음을 읽고 물음에 답하십시오. (각 2점)"
    if q in [21, 22]: return "※ [21～22] 다음을 읽고 물음에 답하십시오. (각 2점)"
    if q in [23, 24]: return "※ [23～24] 다음을 읽고 물음에 답하십시오. (각 2점)"
    if q in range(25, 28): return "※ [25～27] 다음 신문 기사의 제목을 가장 잘 설명한 것을 고르십시오. (각 2점)"
    if q in range(28, 32): return "※ [28～31] (    )에 들어갈 말로 가장 알맞은 것을 고르십시오. (각 2점)"
    if q in range(32, 35): return "※ [32～34] 다음을 읽고 내용과 같은 것을 고르십시오. (각 2점)"
    if q in range(35, 39): return "※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)"
    if q in range(39, 42): return "※ [39～41] 주어진 문장이 들어갈 곳으로 가장 알맞은 것을 고르십시오. (각 2점)"
    if q in [42, 43]: return "※ [42～43] 다음을 읽고 물음에 답하십시오. (각 2점)"
    if q in [44, 45]: return "※ [44～45] 다음을 읽고 물음에 답하십시오. (각 2점)"
    if q in [46, 47]: return "※ [46～47] 다음을 읽고 물음에 답하십시오. (각 2점)"
    if q in range(48, 51): return "※ [48～50] 다음을 읽고 물음에 답하십시오. (각 2점)"
    return ""

def build_reading_102():
    print("Building 102 reading...")
    with open('content/topik2-102/answers.json') as f:
        answers = json.load(f)['reading']
    with open('content/topik2-102/reading-ocr.txt') as f:
        text = f.read()

    manual_102 = {
        1: {
            "prompt": "1. 이 동네로 이사를 (    ) 일 년이 됐다.",
            "passage": None,
            "options": ["온 지", "올 때", "오거나", "오다가"]
        },
        2: {
            "prompt": "2. 가을이 되면서 나뭇잎 색이 점점 붉게 (    ).",
            "passage": None,
            "options": ["변해 간다", "변할 뻔했다", "변한 척했다", "변하면 된다"]
        },
        3: {
            "prompt": "3. 지금 출발하지 않으면 약속 시간에 <u>늦을지도 모른다</u>.",
            "passage": None,
            "options": ["늦는 셈이다", "늦어도 된다", "늦을 리가 없다", "늦을 수도 있다"]
        },
        4: {
            "prompt": "4. 전문가들이 <u>예상한 대로</u> 농산물 가격이 떨어지고 있다.",
            "passage": None,
            "options": ["예상한 탓에", "예상하는 동안에", "예상하기만 하면", "예상한 것과 같이"]
        },
        5: {
            "prompt": "5. 다음은 무엇에 대한 글인지 고르십시오.",
            "passage": "걸을 때 발이 편하게~\n가볍고 디자인도 예뻐요.",
            "options": ["구두", "우산", "자전거", "선풍기"]
        },
        6: {
            "prompt": "6. 다음은 무엇에 대한 글인지 고르십시오.",
            "passage": "더러워진 옷을 새 옷처럼!\n두꺼운 이불도 맡겨 주세요.",
            "options": ["은행", "시장", "세탁소", "가구점"]
        },
        7: {
            "prompt": "7. 다음은 무엇에 대한 글인지 고르십시오.",
            "passage": "달리기, 지금 바로 시작하세요.\n활기찬 내일이 기다립니다.",
            "options": ["전기 절약", "건강 관리", "생활 예절", "환경 보호"]
        },
        8: {
            "prompt": "8. 다음은 무엇에 대한 글인지 고르십시오.",
            "passage": "1. 공연 날짜, 인원을 선택하고 다음 버튼을 누르세요.\n2. 원하는 좌석을 선택한 후 결제하세요.",
            "options": ["예매 방법", "행사 소개", "등록 문의", "교환 순서"]
        },
        9: {
            "prompt": "9. 다음 글 또는 그래프의 내용과 같은 것을 고르십시오.",
            "passage": "그림책 읽어 주는 자원봉사자 모집\n\"어린이들에게 꿈과 희망을 선물하세요.\"\n• 자격: 고등학생 또는 대학생 (※ 한국어를 잘하는 외국인 학생도 가능)\n• 모집 기간: 11월 10일(월)~11월 21일(금)\n• 신청 방법: 인주어린이도서관 홈페이지\n• 활동 기간: 2025년 12월 1일(월)~2026년 2월 28일(토)",
            "options": [
                "봉사 활동은 두 달 동안 하게 된다.",
                "아이들에게 책을 읽어 줄 봉사자를 찾고 있다.",
                "봉사자 신청은 도서관에 직접 가서 해야 한다.",
                "학생이 아닌 사람들도 이 봉사에 참여할 수 있다."
            ],
            "image": "/test/photos/mock-exams/topik2-102/reading-q09.png"
        },
        10: {
            "prompt": "10. 다음 글 또는 그래프의 내용과 같은 것을 고르십시오.",
            "passage": "여행사를 선택할 때 중요하게 생각하는 것\n\n• 가격: 48%\n• 여행 상품의 다양성: 25%\n• 회사의 규모: 16%\n• 이용 후기: 9%\n• 기타: 2%\n〈설문 대상: 성인 남녀 1,600명〉",
            "options": [
                "회사의 규모가 중요하다고 응답한 비율이 가장 낮다.",
                "가격을 중요하게 생각하는 사람이 전체의 반을 넘는다.",
                "이용 후기가 여행 상품의 다양성보다 중요하다는 응답이 두 배 이상 많다.",
                "여행 상품의 다양성보다 회사의 규모를 중요하게 생각하는 사람이 더 적다."
            ],
            "image": "/test/photos/mock-exams/topik2-102/reading-q10.png"
        },
        19: {
            "prompt": "19. ( )에 들어갈 말로 가장 알맞은 것을 고르십시오.",
            "passage": "도시의 도로는 대부분 물이 스며들지 않는 아스팔트로 뒤덮여 있다. 그래서 비가 오면 빗물이 지하로 잘 흘러 들어가지 못해 지하수가 부족해지고 도로가 물에 잠기는 일도 자주 발생한다. 그런데 최근 물이 잘 스며드는 도로 포장재가 개발되었다. 이 포장재에는 미세한 구멍이 많다. 그래서 빗물이 쉽게 통과해 지하수 자원이 보충된다. ( ) 하수구로 몰리는 빗물의 양이 줄어 도로 침수의 위험도 줄어들게 된다.",
            "options": ["또한", "비록", "과연", "반면"]
        }
    }

    positions = []
    for q in range(1, 51):
        m = re.search(rf'(?:^|\n)\s*{q}\.\s*', text)
        if m: positions.append((q, m.start()))
    positions.sort(key=lambda x: x[1])

    questions = []
    for i in range(len(positions)):
        q, start = positions[i]
        end = positions[i+1][1] if i + 1 < len(positions) else len(text)
        chunk = text[start:end]
        ans = answers[q - 1]
        hdr = get_reading_header(q)
        
        if q in manual_102:
            data = manual_102[q]
            full_prompt = f"{hdr}\n{data['prompt']}" if hdr else data['prompt']
            questions.append({
                "question_number": q,
                "section": "reading",
                "prompt": full_prompt,
                "passage": data["passage"],
                "options": data["options"],
                "correct_answer": ans,
                "explanation": f"정답은 {ans}번입니다.",
                "audio_url": None,
                "image_url": data.get("image")
            })
            continue

        opt_start_match = re.search(r'[①1lI]\s*', chunk)
        if opt_start_match:
            psg = clean_noise(chunk[:opt_start_match.start()])
            psg = re.sub(rf'^\s*{q}\.\s*', '', psg).strip()
            opt_chunk = chunk[opt_start_match.start():]
        else:
            psg = clean_noise(chunk)
            opt_chunk = ""

        if q in [39, 40, 41, 46]:
            opts = ["㉠", "㉡", "㉢", "㉣"]
        else:
            opts = []
            for o_idx in range(1, 5):
                m1 = ['①', '②', '③', '④'][o_idx - 1]
                m2 = ['②', '③', '④', None][o_idx - 1]
                if m2:
                    p = re.search(rf'{m1}\s*(.*?)(?={m2})', opt_chunk, re.DOTALL)
                else:
                    p = re.search(rf'{m1}\s*(.*?)(?:\n\s*\d+\.|\Z)', opt_chunk, re.DOTALL)
                val = p.group(1).strip() if p else ''
                val = clean_opt(val)
                val = re.sub(r'\s+', ' ', val).strip()
                opts.append(val)
            for idx in range(4):
                if not opts[idx]: opts[idx] = f"보기 {idx+1}"

        prompt = f"{hdr}\n{q}번 문항"
        sub_q = re.search(rf'{q}\.\s*([^\n]+고르십시오[^\n]*)', psg)
        if sub_q:
            prompt = f"{hdr}\n{q}. {sub_q.group(1).strip()}"
            psg = psg.replace(sub_q.group(0), '').strip()

        questions.append({
            "question_number": q,
            "section": "reading",
            "prompt": prompt,
            "passage": psg if psg else None,
            "options": opts,
            "correct_answer": ans,
            "explanation": f"정답은 {ans}번입니다.",
            "audio_url": None,
            "image_url": None
        })

    out_file = 'content/topik2-102/reading-exam.json'
    with open(out_file, 'w', encoding='utf8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"Saved {out_file}: {len(questions)} questions")
    return questions

def build_reading_83():
    print("Building 83 reading...")
    with open('content/topik2-83/answers.json') as f:
        answers = json.load(f)['reading']
    with open('content/topik2-83/reading-ocr.txt') as f:
        text = f.read()

    manual_83 = {
        1: {
            "prompt": "1. 책을 많이 (    ) 지식을 쌓을 수 있다.",
            "passage": None,
            "options": ["읽으면", "읽든지", "읽지만", "읽거나"]
        },
        2: {
            "prompt": "2. 꽃이 피기 시작하는 걸 보니 봄이 (    ).",
            "passage": None,
            "options": ["오곤 한다", "온 모양이다", "오는 편이다", "온 적이 있다"]
        },
        3: {
            "prompt": "3. 시험이 시작되자 교실은 숨소리가 <u>들릴 만큼</u> 조용해졌다.",
            "passage": None,
            "options": ["들리다가", "들리더라도", "들릴 정도로", "들릴 때까지"]
        },
        4: {
            "prompt": "4. 집의 분위기는 <u>꾸미기 나름이다</u>.",
            "passage": None,
            "options": ["꾸밀 만하다", "꾸미기가 쉽다", "꾸밀 수도 있다", "꾸미기에 달려 있다"]
        },
        5: {
            "prompt": "5. 다음은 무엇에 대한 글인지 고르십시오.",
            "passage": "가벼움을 신다!\n어떤 길에서도 편한 세상을 경험해 보세요.",
            "options": ["안경", "침대", "운동화", "노트북"]
        },
        6: {
            "prompt": "6. 다음은 무엇에 대한 글인지 고르십시오.",
            "passage": "매일 정성을 담아 더 맛있게~\n자연에서 얻은 신선한 재료만을 사용합니다.",
            "options": ["공원", "식당", "꽃집", "서점"]
        },
        7: {
            "prompt": "7. 다음은 무엇에 대한 글인지 고르십시오.",
            "passage": "웃는 얼굴, 밝은 인사\n모두가 기분 좋은 하루의 시작입니다.",
            "options": ["환경 보호", "생활 예절", "건강 관리", "봉사 활동"]
        },
        8: {
            "prompt": "8. 다음은 무엇에 대한 글인지 고르십시오.",
            "passage": "❶ 승강장에서 뛰지 마세요.\n❷ 출입문이 닫힐 때는 무리하게 타지 마세요.",
            "options": ["안전 규칙", "신청 방법", "사용 순서", "교환 안내"]
        },
        9: {
            "prompt": "9. 다음 글 또는 그래프의 내용과 같은 것을 고르십시오.",
            "passage": "인주시의 과거 모습을 찾습니다\n• 기간: 2022년 9월 1일(목)~9월 30일(금)\n• 대상: 1980년 이전에 찍은 사진\n• 방법: 인주 시청 홍보실로 방문 제출\n※ 사진을 제출하신 분께는 문화 상품권(3만 원)을 드립니다.",
            "options": [
                "이 행사는 한 달 동안 진행된다.",
                "사진은 이메일로 제출해야 한다.",
                "인주시에서 올해 찍은 사진을 내면 된다.",
                "이 행사에 참여하면 인주시의 옛날 사진을 받는다."
            ],
            "image": "/test/photos/mock-exams/topik2-83/reading-q09.png"
        },
        10: {
            "prompt": "10. 다음 글 또는 그래프의 내용과 같은 것을 고르십시오.",
            "passage": "대학생 한 달 용돈 어디에 쓸까?\n\n• 식비: 53%\n• 학원비: 21%\n• 교통비: 16%\n• 물건 구입비: 6%\n• 문화생활비: 3%\n• 기타: 1%\n〈조사 대상: 대학생 1,000명〉",
            "options": [
                "용돈 중 물건 구입비의 비율이 가장 낮았다.",
                "학원비 사용은 교통비보다 두 배 이상 많았다.",
                "대학생들은 용돈의 절반 이상을 식비로 지출했다.",
                "대학생들은 문화생활비보다 교통비를 더 적게 사용했다."
            ],
            "image": "/test/photos/mock-exams/topik2-83/reading-q10.png"
        }
    }

    positions = []
    for q in range(1, 51):
        m = re.search(rf'(?:^|\n)\s*{q}\.\s*', text)
        if m: positions.append((q, m.start()))
    positions.sort(key=lambda x: x[1])

    questions = []
    for i in range(len(positions)):
        q, start = positions[i]
        end = positions[i+1][1] if i + 1 < len(positions) else len(text)
        chunk = text[start:end]
        ans = answers[q - 1]
        hdr = get_reading_header(q)
        
        if q in manual_83:
            data = manual_83[q]
            full_prompt = f"{hdr}\n{data['prompt']}" if hdr else data['prompt']
            questions.append({
                "question_number": q,
                "section": "reading",
                "prompt": full_prompt,
                "passage": data["passage"],
                "options": data["options"],
                "correct_answer": ans,
                "explanation": f"정답은 {ans}번입니다.",
                "audio_url": None,
                "image_url": data.get("image")
            })
            continue

        opt_start_match = re.search(r'[①1lI]\s*', chunk)
        if opt_start_match:
            psg = clean_noise(chunk[:opt_start_match.start()])
            psg = re.sub(rf'^\s*{q}\.\s*', '', psg).strip()
            opt_chunk = chunk[opt_start_match.start():]
        else:
            psg = clean_noise(chunk)
            opt_chunk = ""

        if q in [39, 40, 41, 46]:
            opts = ["㉠", "㉡", "㉢", "㉣"]
        else:
            opts = []
            for o_idx in range(1, 5):
                m1 = ['①', '②', '③', '④'][o_idx - 1]
                m2 = ['②', '③', '④', None][o_idx - 1]
                if m2:
                    p = re.search(rf'{m1}\s*(.*?)(?={m2})', opt_chunk, re.DOTALL)
                else:
                    p = re.search(rf'{m1}\s*(.*?)(?:\n\s*\d+\.|\Z)', opt_chunk, re.DOTALL)
                val = p.group(1).strip() if p else ''
                val = clean_opt(val)
                val = re.sub(r'\s+', ' ', val).strip()
                opts.append(val)
            for idx in range(4):
                if not opts[idx]: opts[idx] = f"보기 {idx+1}"

        prompt = f"{hdr}\n{q}번 문항"
        sub_q = re.search(rf'{q}\.\s*([^\n]+고르십시오[^\n]*)', psg)
        if sub_q:
            prompt = f"{hdr}\n{q}. {sub_q.group(1).strip()}"
            psg = psg.replace(sub_q.group(0), '').strip()

        questions.append({
            "question_number": q,
            "section": "reading",
            "prompt": prompt,
            "passage": psg if psg else None,
            "options": opts,
            "correct_answer": ans,
            "explanation": f"정답은 {ans}번입니다.",
            "audio_url": None,
            "image_url": None
        })

    out_file = 'content/topik2-83/reading-exam.json'
    with open(out_file, 'w', encoding='utf8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"Saved {out_file}: {len(questions)} questions")
    return questions

def build_writing(round_num):
    print(f"Building {round_num} writing...")
    if round_num == 102:
        questions = [
            {
                "question_number": 51,
                "section": "writing",
                "question_type": "writing_short_completion",
                "prompt": "※ [51～52] 다음 글의 ㉠과 ㉡에 알맞은 말을 각각 쓰시오. (각 10점)\n51. 다음 글의 ㉠과 ㉡에 알맞은 말을 각각 쓰시오.",
                "passage": "제목 : 개인 물건 정리 요청\n\n안녕하세요. 동아리 회장 흐엉입니다.\n학생회관 공사 때문에 동아리 방을 옮기게 되었습니다.\n그런데 현재 개인 물건들이 너무 많습니다.\n동아리 방을 옮기려면 이 물건들부터 먼저 ( ㉠ ).\n방학을 하자마자 공사가 시작됩니다.\n방학이 ( ㉡ ) 개인 물건을 모두 가져가 주십시오.",
                "options": [],
                "correct_answer": "㉠ 정리해야 합니다 / ㉡ 시작되기 전에",
                "explanation": "[모범답안]\n㉠ 정리해야 합니다 / 치워야 합니다\n㉡ 시작되기 전에 / 시작하기 전에\n\n[채점 기준]\n- ㉠: 동아리 방을 옮기기 위해 물건을 먼저 치우거나 정리해야 한다는 의미 (10점)\n- ㉡: 공사가 방학 직후 시작되므로 방학이 시작되기 전에 물건을 가져가라는 의미 (10점)",
                "audio_url": None,
                "image_url": None
            },
            {
                "question_number": 52,
                "section": "writing",
                "question_type": "writing_short_completion",
                "prompt": "※ [51～52] 다음 글의 ㉠과 ㉡에 알맞은 말을 각각 쓰시오. (각 10점)\n52. 다음 글의 ㉠과 ㉡에 알맞은 말을 각각 쓰시오.",
                "passage": "큰 항공기는 주로 고도가 높은 하늘에서 비행을 한다. 높이 올라가면 날씨의 영향을 별로 ( ㉠ ) 흔들림이 적다. 반면 작은 항공기는 날씨의 영향을 받더라도 낮은 고도에서 비행을 해야 한다. 왜냐하면 높은 고도에서 ( ㉡ ) 항공기의 엔진이 크고 좋아야 하며 연료도 많이 필요하기 때문이다.",
                "options": [],
                "correct_answer": "㉠ 받지 않아서 / ㉡ 비행을 하기 위해서는",
                "explanation": "[모범답안]\n㉠ 받지 않아서 / 받지 않기 때문에\n㉡ 비행을 하기 위해서는 / 날기 위해서는 / 운항하려면\n\n[채점 기준]\n- ㉠: 높은 고도에서는 날씨의 영향을 받지 않아 흔들림이 적다는 맥락의 표현 (10점)\n- ㉡: 높은 고도에서 비행하기 위한 조건(엔진, 연료)을 나타내는 목적/조건 표현 (10점)",
                "audio_url": None,
                "image_url": None
            },
            {
                "question_number": 53,
                "section": "writing",
                "question_type": "writing_graph_description",
                "prompt": "53. 다음은 '한국 캠핑 인구의 변화'에 대한 자료이다. 이 내용을 200~300자의 글로 쓰시오. 단, 글의 제목은 쓰지 마시오. (30점)",
                "passage": "[조사 기관: 한국관광공사]\n\n• 캠핑 인구 변화: 2019년 340만 명 → 2024년 650만 명 (약 2배 증가)\n• 연령별 순위 변화:\n  - 2019년: 1위 20대~30대, 2위 40대~50대\n  - 2024년: 1위 40대~50대, 2위 20대~30대\n• 원인:\n  - 장비의 고급화와 캠핑장 대여료 증가 → 경제력이 요구됨\n  - 자녀와의 여가 활동을 위한 가족 단위 캠핑 증가",
                "options": [],
                "correct_answer": "(200~300자 서술형)",
                "explanation": "[모범답안]\n한국관광공사에서 한국 캠핑 인구의 변화에 대해 조사한 자료에 따르면 캠핑 인구는 2019년에 340만 명이었던 것이 2024년에 650만 명으로 약 2배나 증가하였다. 이를 연령별 순위 변화로 보면 2019년에는 20대~30대가 1위를 차지하였고 2위는 40대~50대로 나타났다. 이와 달리 2024년에는 40대~50대가 1위로 가장 많았고 2위는 20대~30대로 나타났다. 이렇게 변화한 것은 캠핑 장비의 고급화와 캠핑장 대여료 증가로 인해 경제력이 요구되었고 자녀와의 여가 활동을 위한 가족 단위 캠핑이 증가하였기 때문으로 나타났다. (300자)",
                "audio_url": None,
                "image_url": "/test/photos/mock-exams/topik2-102/writing-q53.png"
            },
            {
                "question_number": 54,
                "section": "writing",
                "question_type": "writing_essay",
                "prompt": "54. 다음을 참고하여 600~700자로 글을 쓰시오. 단, 문제를 그대로 옮겨 쓰지 마시오. (50점)",
                "passage": "최근에는 식당에서부터 은행, 병원에 이르기까지 많은 곳에서 다양한 디지털 기기를 사용하고 있다. 하지만 디지털 기기를 활용하지 못해서 소외되는 사람들도 있다. 아래의 내용을 중심으로 '디지털 소외 문제와 해결 방안'에 대한 자신의 생각을 쓰라.\n\n• 디지털 기술은 우리 생활에서 어떻게 활용되고 있는가?\n• 디지털 사회에서 소외되는 사람들은 누구이며, 어떤 문제를 겪을 수 있는가?\n• 디지털 소외 문제를 해결하기 위해 개인과 사회는 어떻게 해야 하는가?",
                "options": [],
                "correct_answer": "(600~700자 논술형)",
                "explanation": "[모범답안]\n과학 기술이 빠르게 발달하면서 과거와는 달리 일상생활에서 디지털 기술의 활용이 일반화되고 있다. 식당에서는 대면을 하지 않아도 키오스크로 음식을 주문할 수 있게 되었고 관공서나 금융 기관을 직접 방문하지 않아도 컴퓨터나 스마트폰으로 서비스를 이용할 수 있게 되었다. 또한 병원의 진료 예약이나 공연, 기차표 등의 예매도 인터넷으로 손쉽게 할 수 있다.\n\n그러나 이러한 편의를 모든 사람들이 동일하게 누리는 것은 아니다. 고령층의 경우 디지털 기기가 익숙하지 않아서 금융 의료 서비스를 이용하는 데에 어려움이 따른다. 그리고 경제적인 여건이 되지 않아 디지털 기기를 구입하거나 사용하는 것이 부담이 되는 사람들도 있을 것이다. 또한 디지털 인프라가 부족한 지역에서 거주하는 사람들은 온라인으로 제공 받을 수 있는 서비스가 제한적이다.\n\n이러한 문제를 해결하기 위해서는 개인과 사회 모두가 노력해야 한다. 개인의 경우 처음에는 익숙하지 않더라도 변화하는 시대에 뒤처지지 않게 디지털 기기의 사용법을 익히도록 해야 한다. 이를 위해서 정부에서는 디지털 소외 계층을 위한 지원 정책을 마련해서 모든 국민들이 일상에서 디지털 기술을 활용할 수 있게 하여 소외되는 사람들이 없도록 해야 한다. 그리고 디지털 인프라를 확충하여 지역과 계층에 무관하게 많은 사람들이 디지털 기술 발달의 혜택을 고르게 누릴 수 있도록 해야 한다. (675자)",
                "audio_url": None,
                "image_url": None
            }
        ]
    elif round_num == 83:
        questions = [
            {
                "question_number": 51,
                "section": "writing",
                "question_type": "writing_short_completion",
                "prompt": "※ [51～52] 다음 글의 ㉠과 ㉡에 알맞은 말을 각각 쓰시오. (각 10점)\n51. 다음 글의 ㉠과 ㉡에 알맞은 말을 각각 쓰시오.",
                "passage": "[자유게시판: 축제 관련 문의]\n\n지난 주말 '인주시 별빛 축제'에 갔던 외국인입니다.\n지금까지 살면서 이렇게 많은 별을 ( ㉠ ) 한 번도 없었습니다.\n이번 축제에서 별도 보고 공연도 볼 수 있어서 정말 좋았습니다.\n혹시 축제가 언제 또 있습니까?\n있다면 이런 멋진 경험을 다시 ( ㉡ ).",
                "options": [],
                "correct_answer": "㉠ 본 적이 / ㉡ 하고 싶습니다",
                "explanation": "[모범답안]\n㉠ 본 적이 / 본 경험이\n㉡ 하고 싶습니다 / 할 수 있으면 좋겠습니다\n\n[채점 기준]\n- ㉠: 별을 본 경험이 없다는 의미로 '-ㄴ 적이 없다/경험이 없다' 표현 사용 (10점)\n- ㉡: 축제 경험을 다시 하고 싶다는 희망/소망을 나타내는 '-고 싶다/바라다' 표현 사용 (10점)",
                "audio_url": None,
                "image_url": None
            },
            {
                "question_number": 52,
                "section": "writing",
                "question_type": "writing_short_completion",
                "prompt": "※ [51～52] 다음 글의 ㉠과 ㉡에 알맞은 말을 각각 쓰시오. (각 10점)\n52. 다음 글의 ㉠과 ㉡에 알맞은 말을 각각 쓰시오.",
                "passage": "식물은 다양한 방법으로 자신을 보호한다. 덩굴성 야자나무는 빈 줄기를 개미에게 집으로 제공한다. 이 나무에 다른 동물이 다가오면 줄기 속에 있던 개미들은 밖으로 나온다. 이때 개미들의 움직임으로 소리가 생긴다. 이 소리는 동물을 깜짝 ( ㉠ ). 결국 놀란 동물은 나뭇잎을 먹지 못하고 달아나 버린다. 식물학자들은 이것이 바로 이 나무가 자신을 보호하는 ( ㉡ ).",
                "options": [],
                "correct_answer": "㉠ 놀라게 한다 / ㉡ 방법이라고 한다",
                "explanation": "[모범답안]\n㉠ 놀라게 한다 / 놀라게 만든다\n㉡ 방법이라고 한다 / 방법이라고 설명한다\n\n[채점 기준]\n- ㉠: 소리가 동물을 놀라게 한다는 사동 표현('-게 하다/-게 만들다') 사용 (10점)\n- ㉡: 식물학자들의 주장을 인용하여 자신을 보호하는 방법임을 나타내는 간접화법('-(이)라고 한다') 사용 (10점)",
                "audio_url": None,
                "image_url": None
            },
            {
                "question_number": 53,
                "section": "writing",
                "question_type": "writing_graph_description",
                "prompt": "53. 다음은 '인주시의 가구 수 변화'에 대한 자료이다. 이 내용을 200~300자의 글로 쓰시오. 단, 글의 제목은 쓰지 마시오. (30점)",
                "passage": "• 조사 기관 : 인주시 사회연구소\n\n• 인주시의 가구 수:\n  - 2001년 15만 가구 → 2021년 21만 가구 (1.4배 증가)\n• 인원수별 가구의 비율:\n  - 1인 가구: 2001년 15% → 2021년 30% (대폭 증가)\n  - 2~3인 가구: 2001년 45% → 2021년 50% (증가)\n  - 4인 이상 가구: 2001년 40% → 2021년 20% (대폭 감소)\n• 원인: 20대 독립 가구 수, 노인 가구 수 증가\n• 전망: 2040년 1인 가구 43% 이상",
                "options": [],
                "correct_answer": "(200~300자 서술형)",
                "explanation": "[모범답안]\n인주시 사회연구소에서는 인주시의 가구 수 변화를 조사하였다. 조사 결과 인주시의 가구 수는 2001년에 15만 가구에서 2021년에는 21만 가구로 1.4배 증가하였다. 이는 인원수별 가구의 비율이 1인 가구는 2001년에 15%에서 2021년에는 30%로 크게 증가하였고 2~3인 가구는 45%에서 50%로 증가한 반면, 4인 이상 가구는 40%에서 20%로 큰 폭으로 감소하였기 때문이다. 이러한 변화는 독립한 20대와 노인 가구 증가의 결과로 보인다. 2040년에는 1인 가구가 43% 이상이 될 전망이다. (287자)",
                "audio_url": None,
                "image_url": "/test/photos/mock-exams/topik2-83/writing-q53.png"
            },
            {
                "question_number": 54,
                "section": "writing",
                "question_type": "writing_essay",
                "prompt": "54. 다음을 참고하여 600~700자로 글을 쓰시오. 단, 문제를 그대로 옮겨 쓰지 마시오. (50점)",
                "passage": "창의력은 새로운 것을 생각해 내는 능력이다. 현대 사회는 개인에게 창의력을 더 많이 요구하고 있다. 아래의 내용을 중심으로 '창의력의 필요성과 이를 기르기 위한 노력'에 대한 자신의 생각을 쓰라.\n\n• 창의력이 필요한 이유는 무엇인가?\n• 창의력을 발휘했을 때 얻을 수 있는 성과는 무엇인가?\n• 창의력을 기르기 위해서 어떠한 노력을 할 수 있는가?",
                "options": [],
                "correct_answer": "(600~700자 논술형)",
                "explanation": "[모범답안]\n변화와 발전을 끊임없이 요구하는 현대 사회에서 창의력은 꼭 필요하다. 먼저 창의력은 새로운 관점을 가져온다. 정보가 넘쳐나는 오늘날 새로운 관점이 있으면 차별화된 시각으로 정보를 통합하고 활용할 수 있다. 또한 우리 사회는 새로운 시도 없이는 발전하기 어려운데 창의력은 기존 사고에 머무르지 않고 변화를 시도할 수 있게 돕는다. 나아가 창의력은 기존의 사고만으로는 해결하기 어려운 문제를 해결하는 데에 중요한 역할을 한다.\n\n이와 같이 창의력은 새로운 사고를 할 수 있게 하므로 창의력을 발휘했을 때 우리는 다양한 성과를 얻을 수 있다. 창의력을 발휘하면 자신의 업무 분야에서 뛰어난 업무 성과를 보일 수 있다. 또한 예술과 문화의 영역에서 음악이나 영화 등 새로운 콘텐츠를 만들어 냄으로써 사람들에게 신선한 감동을 줄 수도 있다. 뿐만 아니라 획기적인 사고를 바탕으로 삶의 질을 높여주는 새로운 상품이나 기술을 발명하여 사회에 기여할 수 있다.\n\n창의력을 기르기 위해서는 먼저 독서 및 다양한 경험을 통해 사고의 폭을 넓혀야 한다. 또한 눈에 보이는 현상에만 집중하는 것이 아니라 현상 뒤에 숨겨진 원인을 탐색하고 새로운 관점으로 문제에 접근하는 태도를 가져야 한다. 마지막으로 기존의 정답에만 머무는 것이 아니라 비판적 사고를 바탕으로 새로운 해결 방안이 없는지를 모색하는 노력을 기울여야 한다. (682자)",
                "audio_url": None,
                "image_url": None
            }
        ]

    out_file = f'content/topik2-{round_num}/writing-exam.json'
    with open(out_file, 'w', encoding='utf8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"Saved {out_file}: {len(questions)} questions")
    return questions

if __name__ == '__main__':
    build_listening(102)
    build_listening(83)
    build_reading_102()
    build_reading_83()
    build_writing(102)
    build_writing(83)

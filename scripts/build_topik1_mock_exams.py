import json, re, os

def clean_opt(text):
    text = re.sub(r'^[①②③④1-4lI\.\s\)]+', '', text.strip())
    text = re.sub(r'---.*', '', text)
    text = re.sub(r'\s*\d+\s*$', '', text)
    return text.strip()

def extract_opts(text):
    opts = {}
    markers = ['①', '②', '③', '④']
    for idx, m in enumerate(markers):
        pat = rf'{m}\s*([^①②③④\n]+(?:\n[^①②③④\n]+)*)'
        m_match = re.search(pat, text)
        if m_match:
            opts[idx+1] = clean_opt(m_match.group(1)).replace('\n', ' ')
    return [opts.get(i, '') for i in range(1, 5)]

def get_listening_prompt(q):
    if q <= 4: return "※ [1～4] 다음을 듣고 <보기>와 같이 물음에 맞는 대답을 고르십시오."
    if q <= 6: return "※ [5～6] 다음을 듣고 <보기>와 같이 이어지는 말을 고르십시오."
    if q <= 10: return "※ [7～10] 여기는 어디입니까? <보기>와 같이 알맞은 것을 고르십시오."
    if q <= 14: return "※ [11～14] 다음은 무엇에 대해 말하고 있습니까? <보기>와 같이 알맞은 것을 고르십시오."
    if q <= 16: return "※ [15～16] 다음 그림을 보고 가장 알맞은 대화를 고르십시오."
    if q <= 21: return "※ [17～21] 다음을 듣고 <보기>와 같이 대화 내용과 같은 것을 고르십시오."
    if q <= 24: return "※ [22～24] 다음을 듣고 중심 생각을 고르십시오."
    if q == 25: return "※ [25～26] 다음을 듣고 물음에 답하십시오.\n25. 어떤 이야기를 하고 있는지 고르십시오."
    if q == 26: return "※ [25～26] 다음을 듣고 물음에 답하십시오.\n26. 들은 내용과 같은 것을 고르십시오."
    if q == 27: return "※ [27～28] 다음을 듣고 물음에 답하십시오.\n27. 두 사람이 무엇에 대해 이야기를 하고 있는지 고르십시오."
    if q == 28: return "※ [27～28] 다음을 듣고 물음에 답하십시오.\n28. 들은 내용과 같은 것을 고르십시오."
    if q == 29: return "※ [29～30] 다음을 듣고 물음에 답하십시오.\n29. 이야기의 내용에 맞는 것을 고르십시오."
    if q == 30: return "※ [29～30] 다음을 듣고 물음에 답하십시오.\n30. 들은 내용과 같은 것을 고르십시오."
    return ""

def get_reading_prompt(q):
    if q in range(31, 34): return "※ [31～33] 무엇에 대한 내용입니까? <보기>와 같이 알맞은 것을 고르십시오."
    if q in range(34, 40): return "※ [34～39] <보기>와 같이 (    )에 들어갈 말로 가장 알맞은 것을 고르십시오."
    if q in range(40, 43): return "※ [40～42] 다음을 읽고 맞지 않는 것을 고르십시오."
    if q in range(43, 46): return "※ [43～45] 다음을 읽고 내용이 같은 것을 고르십시오."
    if q in range(46, 49): return "※ [46～48] 다음을 읽고 중심 생각을 고르십시오."
    if q in [49, 50]: return "※ [49～50] 다음을 읽고 물음에 답하십시오."
    if q in [51, 52]: return "※ [51～52] 다음을 읽고 물음에 답하십시오."
    if q in [53, 54]: return "※ [53～54] 다음을 읽고 물음에 답하십시오."
    if q in [55, 56]: return "※ [55～56] 다음을 읽고 물음에 답하십시오."
    if q in [57, 58]: return "※ [57～58] 다음을 순서에 맞게 배열한 것을 고르십시오."
    if q in [59, 60]: return "※ [59～60] 다음을 읽고 물음에 답하십시오."
    if q in [61, 62]: return "※ [61～62] 다음을 읽고 물음에 답하십시오."
    if q in [63, 64]: return "※ [63～64] 다음을 읽고 물음에 답하십시오."
    if q in [65, 66]: return "※ [65～66] 다음을 읽고 물음에 답하십시오."
    if q in [67, 68]: return "※ [67～68] 다음을 읽고 물음에 답하십시오."
    if q in [69, 70]: return "※ [69～70] 다음을 읽고 물음에 답하십시오."
    return ""

def clean_listening_script(s):
    if not s: return ''
    s = re.sub(r'---PAGE \d+---', '', s, flags=re.IGNORECASE)
    s = re.sub(r'---.*', '', s)
    s = re.sub(r'TOPIK\s*제?\d*회?.*', '', s, flags=re.IGNORECASE)
    s = re.sub(r'제\d+회\s*한국어능력시험.*', '', s)
    s = re.sub(r'홀수형.*', '', s)
    s = re.sub(r'짝수형.*', '', s)
    s = re.sub(r'듣기\s*통합.*', '', s)
    s = re.sub(r'※.*', '', s)
    s = re.sub(r'^\s*[①②③④\d\s\.\)]+$', '', s, flags=re.MULTILINE)
    # Remove options leaked into Q19 in 102
    s = re.sub(r'\n\s*여자는\s*운전에\s*익숙해졌습니다.*', '', s, flags=re.DOTALL)
    s = re.sub(r'\n{3,}','\n\n', s)
    return s.strip()

def build_listening(round_num):
    print(f"Building {round_num} listening...")
    with open(f'content/topik1-{round_num}/answers.json') as f:
        answers = json.load(f)['listening']
    with open(f'content/topik1-{round_num}/listening-ocr.txt') as f:
        l_text = f.read()

    # Pre-extract shared dialogues for paired questions (25-26, 27-28, 29-30)
    m25 = re.search(r'※\s*\[25[~～-]26\].*?\n(.*?)(?=\n\s*25\.)', l_text, re.DOTALL)
    dialogue_25_26 = clean_listening_script(m25.group(1)) if m25 else ''

    m27 = re.search(r'※\s*\[27[~～-]28\].*?\n(.*?)(?=\n\s*27\.)', l_text, re.DOTALL)
    dialogue_27_28 = clean_listening_script(m27.group(1)) if m27 else ''

    m29 = re.search(r'※\s*\[29[~～-]30\].*?\n(.*?)(?=\n\s*29\.)', l_text, re.DOTALL)
    dialogue_29_30 = clean_listening_script(m29.group(1)) if m29 else ''

    opts_override = {}
    if round_num == 102:
        opts_override = {
            1: ["네, 우산이 있어요.", "네, 우산이 아니에요.", "아니요, 우산이에요.", "아니요, 우산이 작아요."],
            2: ["네, 신문이 없어요.", "네, 신문을 싫어해요.", "아니요, 신문을 안 봐요.", "아니요, 신문이 재미있어요."],
            3: ["혼자 먹었어요.", "불고기를 먹었어요.", "저녁에 먹었어요.", "학교에서 먹었어요."],
            4: ["두 개예요.", "네 시예요.", "팔 일이에요.", "수요일이에요."],
            5: ["미안해요.", "반가워요.", "실례해요.", "아니에요."],
            6: ["그렇습니다.", "알겠습니다.", "환영합니다.", "오랜만입니다."],
            7: ["빵집", "서점", "옷 가게", "신발 가게"],
            8: ["꽃집", "은행", "정류장", "지하철역"],
            9: ["식당", "약국", "미용실", "도서관"],
            10: ["극장", "시장", "우체국", "사진관"],
            11: ["가족", "나라", "시간", "약속"],
            12: ["직업", "이름", "날씨", "휴일"],
            13: ["건강", "계획", "방학", "운동"],
            14: ["값", "집", "가구", "고향"],
            15: ["①", "②", "③", "④"],
            16: ["①", "②", "③", "④"],
            19: ["여자는 운전에 익숙해졌습니다.", "남자는 운전을 할 줄 모릅니다.", "여자는 내일부터 회사에 운전해서 갈 겁니다.", "남자는 여자가 운전하는 것을 본 적이 없습니다."],
            25: ["청소 일정을 안내하려고", "청소 신청 방법을 알리려고", "청소가 필요한 이유를 설명하려고", "청소 날짜가 바뀐 것을 이야기하려고"]
        }
    elif round_num == 83:
        opts_override = {
            1: ["네. 학생이에요.", "네. 학생이 없어요.", "아니요. 학생이 와요.", "아니요. 학생이 많아요."],
            2: ["네. 책을 싫어해요.", "네. 책이 아니에요.", "아니요. 책이 있어요.", "아니요. 책을 안 읽어요."],
            3: ["지금 해요.", "우리가 해요.", "카페에서 해요.", "동생하고 해요."],
            4: ["어제 갔어요.", "자주 갔어요.", "친구가 갔어요.", "지하철로 갔어요."],
            5: ["축하해요.", "아니에요.", "고마워요.", "반가워요."],
            6: ["잘 먹겠습니다.", "잘 지냈습니다.", "네. 알겠습니다.", "네. 그렇습니다."],
            7: ["가게", "극장", "식당", "공항"],
            8: ["교실", "미술관", "수영장", "우체국"],
            9: ["병원", "세탁소", "안경점", "여행사"],
            10: ["서점", "은행", "꽃집", "약국"],
            11: ["계절", "나이", "날짜", "휴일"],
            12: ["운동", "음식", "이름", "직업"],
            13: ["가족", "선물", "취미", "하숙집"],
            14: ["교통", "쇼핑", "위치", "주말"],
            15: ["①", "②", "③", "④"],
            16: ["①", "②", "③", "④"],
            21: ["남자는 병원에서 일합니다.", "여자는 오전에 예약을 했습니다.", "여자는 남자와 같이 병원에 갑니다.", "남자는 수요일에 병원에 갈 겁니다."],
            27: ["꽃을 키우는 방법", "꽃을 사는 이유", "꽃을 선물할 사람", "특별한 날에 사는 꽃"]
        }

    questions = []
    for q in range(1, 31):
        ans = answers[q - 1]
        audio = f"/test/audio/topik1-{round_num}/listening-q{q:02d}.mp3"
        prompt = get_listening_prompt(q)
        img = f"/test/photos/mock-exams/topik1-{round_num}/q{q:02d}.png" if q in [15, 16] else None

        next_pat = rf'(?:\n\s*){q+1}\.' if q < 30 else r'\Z'
        m = re.search(rf'(?:^|\n)\s*{q}\.\s*(?:(?:\(\d점\))?\s*)(.*?)(?={next_pat}|※|\Z)', l_text, re.DOTALL)
        chunk = m.group(1).strip() if m else ''
        
        opt_start = re.search(r'(?:\n|^)\s*[①lI1]\s+', chunk)
        if opt_start:
            script_chunk = chunk[:opt_start.start()].strip()
        else:
            script_chunk = chunk

        # Correct shared dialogues for Q25~Q30
        passage_text = None
        if q in [25, 26]:
            script_chunk = dialogue_25_26
            passage_text = dialogue_25_26
        elif q in [27, 28]:
            script_chunk = dialogue_27_28
            passage_text = dialogue_27_28
        elif q in [29, 30]:
            script_chunk = dialogue_29_30
            passage_text = dialogue_29_30
        else:
            script_chunk = clean_listening_script(script_chunk)

        if q in opts_override:
            opts = opts_override[q]
        else:
            opts = extract_opts(chunk)

        explanation = f"[듣기 대본]\n{script_chunk}\n\n[정답 해설] 정답은 {ans}번입니다." if script_chunk else f"[정답 해설] 정답은 {ans}번입니다."
        questions.append({
            "question_number": q,
            "section": "listening",
            "prompt": prompt,
            "question_text": None,
            "passage": passage_text,
            "options": opts,
            "correct_answer": ans,
            "explanation": explanation,
            "audio_url": audio,
            "image_url": img
        })

    out_file = f'content/topik1-{round_num}/listening-exam.json'
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"✅ Saved {out_file}: {len(questions)} questions")
    return questions

def build_reading(round_num):
    print(f"Building {round_num} reading...")
    with open(f'content/topik1-{round_num}/answers.json') as f:
        answers = json.load(f)['reading']
    with open(f'content/topik1-{round_num}/reading-ocr.txt') as f:
        text = f.read()

    if round_num == 83:
        text = re.sub(r'31…', '31.', text)
        text = re.sub(r'※\s*155~56\]', '※ [55~56]', text)

    r_text = text[text.find('TOPIK I 읽기'):]

    pairs = [(49, 50), (51, 52), (53, 54), (55, 56), (59, 60), (61, 62), (63, 64), (65, 66), (67, 68), (69, 70)]
    pair_passages = {}
    for p1, p2 in pairs:
        pat = rf'※\s*\[?\s*{p1}\s*[～~-]\s*{p2}\s*\]?.*?\n(.*?)(?=\n\s*{p1}\.)'
        m = re.search(pat, r_text, re.DOTALL)
        if m:
            pair_passages[p1] = m.group(1).strip()
            pair_passages[p2] = m.group(1).strip()

    reading_override = {}
    if round_num == 102:
        reading_override = {
            34: {
                "passage": "저는 의사입니다. (    )에서 일합니다.",
                "options": ["병원", "서점", "미용실", "우체국"]
            },
            35: {
                "passage": "저는 일이 많습니다. 그래서 조금 (    ).",
                "options": ["작습니다", "비쌉니다", "무겁습니다", "피곤합니다"]
            },
            36: {
                "passage": "친구를 만났습니다. 우리는 (    ) 공부를 했습니다.",
                "options": ["가장", "아직", "별로", "같이"]
            },
            37: {
                "passage": "방이 덥습니다. 창문(    ) 엽니다.",
                "options": ["에", "의", "을", "이"]
            },
            49: {
                "options": ["자르면", "자르니까", "잘랐거나", "잘랐지만"]
            },
            51: {
                "options": ["그리고", "그래도", "그렇지만", "왜냐하면"]
            },
            55: {
                "options": ["많아도 됩니다", "많아야 합니다", "많기 때문입니다", "많은 적이 있습니다"]
            },
            57: {
                "options": ["(가)-(나)-(다)-(라)", "(가)-(라)-(다)-(나)", "(라)-(가)-(나)-(다)", "(라)-(나)-(다)-(가)"]
            },
            58: {
                "options": ["(라)-(가)-(나)-(다)", "(다)-(나)-(가)-(라)", "(라)-(나)-(가)-(다)", "(라)-(다)-(가)-(나)"]
            },
            59: {
                "options": ["㉠", "㉡", "㉢", "㉣"]
            },
            61: {
                "options": ["장소를 찾는", "배우를 찾는", "옷을 만드는", "음악을 만드는"]
            },
            65: {
                "options": ["잠을 자는", "자기를 지키는", "음식을 구하는", "상처를 치료하는"]
            },
            68: {
                "options": [
                    "이 로봇은 아이들에게 책을 골라 줍니다.",
                    "이 로봇은 한글을 몰라도 이용할 수 있습니다.",
                    "이 로봇은 모양 때문에 아이들에게 인기가 없습니다.",
                    "이 로봇을 빌리려면 도서관에 가서 신청해야 합니다."
                ]
            }
        }
    elif round_num == 83:
        reading_override = {
            33: {
                "options": ["계절", "방학", "여행", "위치"]
            },
            34: {
                "passage": "영화를 (    ). 정말 재미있습니다.",
                "options": ["봅니다", "잡니다", "보냅니다", "마십니다"]
            },
            40: {
                "options": ["우유입니다.", "천 원입니다.", "딸기 맛입니다.", "팔월까지 팝니다."]
            },
            41: {
                "options": ["방이 많습니다.", "부엌이 큽니다.", "화장실이 있습니다.", "대학교에서 가깝습니다."]
            },
            49: {
                "options": ["그러면", "하지만", "그래서", "그리고"]
            },
            52: {
                "options": ["꽃 축제를 여는 이유", "꽃 축제가 열리는 장소", "꽃 축제에 들어가는 방법", "꽃 축제에서 할 수 있는 일"]
            },
            55: {
                "options": ["요즘에 나온", "어릴 때 읽은", "아이들이 만든", "박물관에서 빌려 온"]
            },
            59: {
                "options": ["㉠", "㉡", "㉢", "㉣"]
            }
        }

    questions = []
    for q in range(31, 71):
        ans = answers[q - 31]
        prompt = get_reading_prompt(q)

        img = f"/test/photos/mock-exams/topik1-{round_num}/reading-q{q:02d}.png{'?v=2' if round_num == 102 else ''}" if q in [40, 41, 42] else None

        next_pat = rf'(?:\n\s*){q+1}\.' if q < 70 else r'\Z'
        m = re.search(rf'(?:^|\n)\s*{q}\.\s*(.*?)(?={next_pat}|※\s*\[|\Z)', r_text, re.DOTALL)
        chunk = m.group(1).strip() if m else ''

        opt_start = re.search(r'(?:\n|^)\s*[①lI1]\s+', chunk)
        if opt_start:
            q_passage_part = chunk[:opt_start.start()].strip()
            opts_part = chunk[opt_start.start():].strip()
        else:
            q_passage_part = chunk
            opts_part = chunk

        opts = extract_opts(opts_part)

        if q in pair_passages:
            passage = pair_passages[q]
            question_text = re.sub(r'^\s*\(?\d점\)?', '', q_passage_part).strip()
        else:
            passage = re.sub(r'^\s*\(?\d점\)?', '', q_passage_part).strip() if q_passage_part else None
            question_text = None

        if q in reading_override:
            over = reading_override[q]
            if "options" in over:
                opts = over["options"]
            if "passage" in over:
                passage = over["passage"]

        if passage:
            passage = re.sub(r'---.*', '', passage).strip()
        if question_text:
            question_text = re.sub(r'---.*', '', question_text).strip()

        explanation = f"[정답 해설] 정답은 {ans}번입니다."

        questions.append({
            "question_number": q,
            "section": "reading",
            "prompt": prompt,
            "question_text": question_text,
            "passage": passage,
            "options": opts,
            "correct_answer": ans,
            "explanation": explanation,
            "audio_url": None,
            "image_url": img
        })

    out_file = f'content/topik1-{round_num}/reading-exam.json'
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"✅ Saved {out_file}: {len(questions)} questions")
    return questions

build_listening(102)
build_listening(83)
build_reading(102)
build_reading(83)
print("🎉 All TOPIK 1 mock exam JSONs built successfully!")

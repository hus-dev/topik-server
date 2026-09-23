import json, re, os
import pymupdf

def clean_opt(text):
    text = re.sub(r'^[①②③④1-4lI\.\s\)]+', '', text.strip())
    # remove trailing option numbers or annotations
    text = re.sub(r'\s*[①②③④].*$', '', text)
    return text.strip()

def build_102_listening():
    with open('topik_data/topik2-102/제102회_정답 및 배점표_TOPIK2_탑재용.pdf') as _:
        pass # check file exists
    with open('content/topik2-102/answers.json') as f:
        answers = json.load(f)['listening']
    
    with open('content/topik2-102/listening-ocr.txt') as f:
        text = f.read()

    # Listening instructions by question range
    def get_instruction(q):
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

    questions = []
    for q_num in range(1, 51):
        ans = answers[q_num - 1]
        audio = f"/test/audio/topik2-102/listening-q{q_num:02d}.mp3"
        prompt = get_instruction(q_num)
        
        if q_num <= 3:
            img = f"/test/photos/mock-exams/topik2-102/q{q_num:02d}.png"
            opts = ["①", "②", "③", "④"]
            # Extract script from OCR text
            q_marker = f"{q_num}."
            start = text.find(q_marker)
            script = ""
            if start != -1:
                end = text.find("①", start)
                if end != -1:
                    script = text[start + len(q_marker):end].strip()
            explanation = f"[듣기 대본]\n{script}\n\n[정답 해설] 정답은 {ans}번입니다."
            questions.append({
                "question_number": q_num,
                "section": "listening",
                "prompt": prompt,
                "passage": None,
                "options": opts,
                "correct_answer": ans,
                "explanation": explanation,
                "audio_url": audio,
                "image_url": img
            })
        else:
            # Q4-Q50
            # Look up options in text
            # Find question chunk in OCR
            m = re.search(rf'(?:^|\n)\s*{q_num}\.\s*', text)
            opts = ["", "", "", ""]
            script = ""
            if m:
                start = m.start()
                next_m = re.search(rf'(?:^|\n)\s*{q_num + 1}\.\s*', text[start + 5:])
                end = (start + 5 + next_m.start()) if next_m else len(text)
                chunk = text[start:end]
                
                # Split script and options
                first_opt = re.search(r'[①1lI]\s*', chunk)
                if first_opt:
                    script = chunk[:first_opt.start()].strip()
                    # clean script line
                    script = re.sub(rf'^\s*{q_num}\.\s*', '', script).strip()
                    
                    # Extract 4 options
                    opt_matches = list(re.finditer(r'([①②③④])\s*([^\n①②③④]+)', chunk))
                    if len(opt_matches) >= 4:
                        for idx, om in enumerate(opt_matches[:4]):
                            opts[idx] = clean_opt(om.group(2))
                    else:
                        # Fallback parsing line by line
                        lines = [l.strip() for l in chunk[first_opt.start():].split('\n') if l.strip()]
                        o_idx = 0
                        for l in lines:
                            if any(l.startswith(m) for m in ['①', '②', '③', '④', '1.', '2.', '3.', '4.']):
                                if o_idx < 4:
                                    opts[o_idx] = clean_opt(l)
                                    o_idx += 1
            
            # fallback if opts not filled
            for i in range(4):
                if not opts[i]:
                    opts[i] = f"보기 {i+1}"
                    
            explanation = f"[듣기 대본]\n{script}\n\n[정답 해설] 정답은 {ans}번입니다." if script else f"[정답 해설] 정답은 {ans}번입니다."
            questions.append({
                "question_number": q_num,
                "section": "listening",
                "prompt": prompt,
                "passage": None,
                "options": opts,
                "correct_answer": ans,
                "explanation": explanation,
                "audio_url": audio,
                "image_url": None
            })

    with open('content/topik2-102/listening-exam.json', 'w', encoding='utf8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print("102 Listening built:", len(questions), "questions")

build_102_listening()

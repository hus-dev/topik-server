import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getPrivacyPolicyHtml(): string {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TOPIK GO 개인정보처리방침 (Privacy Policy)</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 24px; background: #f9fafb; }
    .container { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 36px 32px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    h1 { color: #0d9488; font-size: 26px; border-bottom: 2px solid #ccfbf1; padding-bottom: 12px; margin-top: 0; }
    h2 { color: #111827; font-size: 18px; margin-top: 28px; }
    p, li { font-size: 15px; color: #4b5563; }
    ul { padding-left: 20px; }
    .badge { display: inline-block; background: #e6fffa; color: #0f766e; padding: 4px 10px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">시행일자: 2026년 10월 1일</span>
    <h1>TOPIK GO 개인정보처리방침 (Privacy Policy)</h1>
    <p>TOPIK GO(이하 "서비스")는 이용자의 개인정보를 소중히 다루며, 「개인정보 보호법」 및 관련 법령을 준수합니다. 본 방침은 서비스가 수집하는 정보, 이용 목적, 보관 및 파기 절차에 대해 안내합니다.</p>

    <h2>1. 수집하는 개인정보 항목</h2>
    <ul>
      <li><strong>필수 항목:</strong> 이메일 주소, 비밀번호(암호화 저장), 닉네임</li>
      <li><strong>소셜 로그인 시:</strong> 소셜 제공업체 고유 식별자(Google, Kakao), 프로필 닉네임, 이메일</li>
      <li><strong>학습 서비스 이용 과정에서 생성되는 정보:</strong> 모의고사 응시 기록, 답안, 점수, 단어장 및 문법 저장 내역, 목표 TOPIK 등급, 선호 학습 언어</li>
      <li><strong>서비스 이용 및 기기 정보:</strong> 기기 식별자, 접속 로그, 서비스 이용 기록</li>
    </ul>

    <h2>2. 개인정보의 수집 및 이용 목적</h2>
    <ul>
      <li>회원 식별 및 계정 가입·관리</li>
      <li>맞춤형 한국어 능력시험(TOPIK) 학습 콘텐츠 및 AI 해설 제공</li>
      <li>모의고사 채점, 학습 진도 및 성적 분석 데이터 제공</li>
      <li>서비스 공지사항 전달, 문의 대응 및 고객 지원</li>
      <li>부정 이용 방지 및 서비스 품질 개선</li>
    </ul>

    <h2>3. 개인정보의 보유 및 이용 기간</h2>
    <ul>
      <li>이용자의 개인정보는 <strong>회원 탈퇴 시까지</strong> 보유 및 이용됩니다.</li>
      <li><strong>회원 탈퇴 시:</strong> 앱 내 [설정 &gt; 회원 탈퇴] 또는 탈퇴 요청 시 이용자의 개인정보 및 모든 학습 데이터(시험 세션, 답안, 단어장, 오답노트 등)는 즉시 영구 삭제 및 파기됩니다.</li>
      <li>관계 법령의 규정에 따라 보존할 필요가 있는 경우, 해당 법령에서 정한 기간 동안 분리 보관합니다.</li>
    </ul>

    <h2>4. 개인정보의 제3자 제공 및 처리 위탁</h2>
    <ul>
      <li>서비스는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다.</li>
      <li>원활한 서비스 제공을 위해 아래와 같이 인프라 서비스에 위탁 운영하고 있습니다:
        <ul>
          <li><strong>클라우드 인프라 호스팅:</strong> Amazon Web Services(AWS) - 안전한 데이터 보관 및 처리</li>
        </ul>
      </li>
    </ul>

    <h2>5. 이용자의 권리와 행사 방법</h2>
    <ul>
      <li>이용자는 언제든지 앱 내 프로필 설정을 통해 자신의 개인정보를 조회하거나 수정할 수 있습니다.</li>
      <li>이용자는 언제든지 앱 내 [설정 &gt; 회원 탈퇴] 기능을 통해 즉시 계정을 삭제하고 모든 데이터의 파기를 요청할 수 있습니다.</li>
      <li>법정 대리인이나 권한 있는 자를 통한 권리 행사도 가능합니다.</li>
    </ul>

    <h2>6. 개인정보의 안전성 확보 조치</h2>
    <ul>
      <li>비밀번호 및 민감 정보의 안전한 단방향 암호화(Bcrypt, Salt) 적용</li>
      <li>SSL/TLS 전송 구간 암호화를 통한 안전한 통신</li>
      <li>비인가 접근 차단을 위한 접근 통제 시스템 및 방화벽 운영</li>
    </ul>

    <h2>7. 개인정보 보호책임자 및 문의처</h2>
    <p>개인정보 처리와 관련한 문의사항이나 불만 처리는 아래 연락처로 문의해 주시기 바랍니다.</p>
    <ul>
      <li><strong>책임자:</strong> TOPIK GO 개인정보보호 담당자</li>
      <li><strong>문의 이메일:</strong> husanboy.hakimov.dev@gmail.com</li>
    </ul>

    <div class="footer">
      &copy; 2026 TOPIK GO. All rights reserved.
    </div>
  </div>
</body>
</html>`;
  }

  getTermsHtml(): string {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TOPIK GO 서비스 이용약관 (Terms of Service)</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 24px; background: #f9fafb; }
    .container { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 36px 32px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    h1 { color: #0d9488; font-size: 26px; border-bottom: 2px solid #ccfbf1; padding-bottom: 12px; margin-top: 0; }
    h2 { color: #111827; font-size: 18px; margin-top: 28px; }
    p, li { font-size: 15px; color: #4b5563; }
    ul { padding-left: 20px; }
    .badge { display: inline-block; background: #e6fffa; color: #0f766e; padding: 4px 10px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">시행일자: 2026년 10월 1일</span>
    <h1>TOPIK GO 서비스 이용약관 (Terms of Service)</h1>
    <p>본 약관은 TOPIK GO(이하 "서비스")가 제공하는 한국어능력시험(TOPIK) 대비 모바일 애플리케이션 및 제반 서비스의 이용 조건 및 절차에 관한 기본적인 사항을 규정합니다.</p>

    <h2>제1조 (목적)</h2>
    <p>본 약관은 회원이 서비스가 제공하는 디지털 학습 콘텐츠(기출문제, 모의고사, 단어장, 문법, AI 해설 등)를 이용함에 있어 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>

    <h2>제2조 (용어의 정의)</h2>
    <ul>
      <li><strong>"서비스"</strong>란 TOPIK GO 앱 및 관련 서버에서 제공하는 일체의 학습 기능을 의미합니다.</li>
      <li><strong>"회원"</strong>이란 본 약관에 동의하고 계정을 생성하여 서비스를 이용하는 자를 의미합니다.</li>
      <li><strong>"콘텐츠"</strong>란 서비스 내 제공되는 문제, 해설, 음원, 동영상, 단어, 문법 등의 학습 자료를 의미합니다.</li>
    </ul>

    <h2>제3조 (약관의 효력 및 변경)</h2>
    <p>본 약관은 서비스를 이용하고자 하는 자가 본 약관에 동의함으로써 효력이 발생합니다. 서비스는 관련 법령을 위배하지 않는 범위 내에서 약관을 변경할 수 있으며, 변경된 약관은 앱 내 공지사항 또는 설정을 통해 공지합니다.</p>

    <h2>제4조 (회원가입 및 계정 관리)</h2>
    <ul>
      <li>이용자는 서비스가 정한 절차에 따라 가입을 신청하며, 이메일 인증 또는 소셜 계정 연동을 통해 가입할 수 있습니다.</li>
      <li>회원은 본인의 계정 정보를 타인에게 양도하거나 대여할 수 없으며, 계정 관리 소홀로 인한 책임은 회원 본인에게 있습니다.</li>
    </ul>

    <h2>제5조 (서비스의 제공 및 이용)</h2>
    <ul>
      <li>서비스는 연중무휴 1일 24시간 제공을 원칙으로 하되, 시스템 점검 또는 기술적 필요에 따라 일시 중단될 수 있습니다.</li>
      <li>서비스 내 일부 기능(AI 예문 생성, 실시간 번역 등)에는 인공지능 기술이 활용되며, 이는 학습 보조용으로 제공됩니다.</li>
    </ul>

    <h2>제6조 (이용자의 의무 및 금지사항)</h2>
    <p>회원은 다음 행위를 하여서는 안 됩니다:</p>
    <ul>
      <li>타인의 정보 도용 또는 허위 정보 등록</li>
      <li>서비스 내 제공되는 학습 콘텐츠의 무단 복제, 배포, 상업적 이용 또는 리버스 엔지니어링</li>
      <li>서비스의 정상적인 운영을 방해하는 해킹 또는 악성 프로그램 유포</li>
      <li>기타 관계 법령이나 공서양속에 반하는 행위</li>
    </ul>

    <h2>제7조 (계정 해지 및 탈퇴)</h2>
    <p>회원은 언제든지 서비스 내 [설정 &gt; 회원 탈퇴]를 통해 이용계약을 해지할 수 있습니다. 탈퇴 완료 시 회원의 모든 학습 이력, 오답노트, 단어장은 영구 삭제되며 복구되지 않습니다.</p>

    <h2>제8조 (면책 조항)</h2>
    <ul>
      <li>천재지변 또는 불가항력으로 인해 서비스를 제공할 수 없는 경우 서비스 제공에 관한 책임이 면제됩니다.</li>
      <li>서비스에서 제공하는 학습 콘텐츠 및 점수 예측은 수험생의 학습 참고용이며, 공식 시험의 성적을 보증하지 않습니다.</li>
    </ul>

    <h2>제9조 (준거법 및 관할)</h2>
    <p>본 약관의 해석 및 회원과 서비스 간의 분쟁에 대하여는 대한민국 법률을 적용하며, 분쟁 발생 시 관할 법원에 소를 제기할 수 있습니다.</p>

    <div class="footer">
      &copy; 2026 TOPIK GO. All rights reserved.
    </div>
  </div>
</body>
</html>`;
  }
}


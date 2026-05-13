import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

type GrammarItem = {
  pattern: string;
  description: string;
  examples_json: Array<{ ko: string; en: string }>;
  tags_json: string[];
};

const grammarItems: GrammarItem[] = [
  ['-고 있다', 'Expresses an action currently in progress.', '지금 한국어를 공부하고 있어요.', 'I am studying Korean now.', ['TOPIK I', 'progressive']],
  ['-(으)ㄹ 수 있다', 'Expresses ability or possibility.', '저는 한국어로 이메일을 쓸 수 있어요.', 'I can write an email in Korean.', ['TOPIK I', 'ability']],
  ['-(으)ㄹ 수 없다', 'Expresses inability or impossibility.', '오늘은 시간이 없어서 갈 수 없어요.', 'I cannot go today because I do not have time.', ['TOPIK I', 'ability']],
  ['-아/어 보다', 'Expresses trying or experiencing an action.', '이 음식을 한번 먹어 보세요.', 'Please try this food once.', ['TOPIK I', 'experience']],
  ['-아/어 주다', 'Expresses doing something for someone.', '문을 좀 닫아 주세요.', 'Please close the door for me.', ['TOPIK I', 'request']],
  ['-아/어도 되다', 'Asks or gives permission.', '여기에 앉아도 돼요?', 'May I sit here?', ['TOPIK I', 'permission']],
  ['-(으)면 안 되다', 'Expresses prohibition.', '시험 중에는 휴대폰을 보면 안 됩니다.', 'You must not look at your phone during the exam.', ['TOPIK I', 'prohibition']],
  ['-아/어야 하다', 'Expresses obligation or necessity.', '내일까지 숙제를 내야 해요.', 'I have to submit the homework by tomorrow.', ['TOPIK I', 'obligation']],
  ['-(으)려고 하다', 'Expresses intention or plan.', '주말에 친구를 만나려고 해요.', 'I plan to meet a friend this weekend.', ['TOPIK I', 'intention']],
  ['-(으)러 가다/오다', 'Expresses purpose of going or coming.', '책을 빌리러 도서관에 갔어요.', 'I went to the library to borrow books.', ['TOPIK I', 'purpose']],
  ['-(으)니까', 'Gives a reason or basis.', '비가 오니까 우산을 가져가세요.', 'Take an umbrella because it is raining.', ['TOPIK I', 'reason']],
  ['-아서/어서', 'Connects reason, sequence, or method.', '길이 막혀서 늦었어요.', 'I was late because the road was congested.', ['TOPIK I', 'reason']],
  ['-지만', 'Contrasts two clauses.', '이 옷은 예쁘지만 조금 비싸요.', 'This clothing is pretty, but it is a little expensive.', ['TOPIK I', 'contrast']],
  ['-(으)면', 'Expresses condition.', '시간이 있으면 같이 점심을 먹어요.', 'If you have time, let us eat lunch together.', ['TOPIK I', 'condition']],
  ['-고 나서', 'Means after completing an action.', '운동하고 나서 샤워를 했어요.', 'After exercising, I took a shower.', ['TOPIK I', 'sequence']],
  ['-기 전에', 'Means before doing an action.', '자기 전에 책을 읽어요.', 'I read a book before sleeping.', ['TOPIK I', 'time']],
  ['-(으)ㄴ 후에', 'Means after an action or event.', '수업이 끝난 후에 선생님을 만났어요.', 'I met the teacher after class ended.', ['TOPIK I', 'time']],
  ['-는 동안', 'Means during the time an action continues.', '버스를 기다리는 동안 음악을 들었어요.', 'I listened to music while waiting for the bus.', ['TOPIK I', 'time']],
  ['-(으)면서', 'Expresses two actions happening at the same time.', '커피를 마시면서 이야기했어요.', 'We talked while drinking coffee.', ['TOPIK I', 'simultaneous']],
  ['-거나', 'Lists alternatives.', '주말에는 영화를 보거나 쉬어요.', 'On weekends, I watch movies or rest.', ['TOPIK I', 'choice']],
  ['-(으)ㄹ 때', 'Means when something happens.', '길을 건널 때 조심하세요.', 'Be careful when crossing the street.', ['TOPIK I', 'time']],
  ['-게 되다', 'Expresses a change or result that came about.', '한국 회사에서 일하게 되었어요.', 'I came to work at a Korean company.', ['TOPIK II', 'change']],
  ['-아/어지다', 'Expresses a change in state.', '날씨가 점점 추워졌어요.', 'The weather became colder and colder.', ['TOPIK II', 'change']],
  ['-게 하다', 'Expresses causing or making someone do something.', '선생님은 학생들이 발표하게 했어요.', 'The teacher made the students present.', ['TOPIK II', 'causative']],
  ['-도록 하다', 'Expresses instruction, effort, or arrangement.', '내일부터 일찍 오도록 하세요.', 'Please make sure to come early from tomorrow.', ['TOPIK II', 'instruction']],
  ['-도록', 'Expresses purpose, extent, or result.', '잘 들리도록 크게 말해 주세요.', 'Please speak loudly so it can be heard well.', ['TOPIK II', 'purpose']],
  ['-기 위해서', 'Expresses purpose.', '건강을 지키기 위해서 매일 운동해요.', 'I exercise every day to protect my health.', ['TOPIK II', 'purpose']],
  ['-(으)로 인해', 'Means due to or because of.', '폭우로 인해 행사가 취소되었습니다.', 'The event was canceled due to heavy rain.', ['TOPIK II', 'cause']],
  ['-때문에', 'Expresses reason or cause.', '교통사고 때문에 길이 막혔어요.', 'The road was congested because of a traffic accident.', ['TOPIK I', 'cause']],
  ['-덕분에', 'Expresses a positive reason.', '친구 덕분에 문제를 해결했어요.', 'Thanks to my friend, I solved the problem.', ['TOPIK II', 'cause']],
  ['-탓에', 'Expresses a negative reason.', '준비가 부족한 탓에 결과가 좋지 않았어요.', 'The result was not good due to insufficient preparation.', ['TOPIK II', 'cause']],
  ['-(으)ㄴ/는 탓이다', 'Says something is the fault or cause.', '실패한 것은 연습이 부족한 탓이에요.', 'The failure is due to lack of practice.', ['TOPIK II', 'cause']],
  ['-(으)ㄴ/는 덕분이다', 'Says something happened thanks to a reason.', '성공한 것은 팀원들이 도와준 덕분입니다.', 'The success was thanks to the team members helping.', ['TOPIK II', 'cause']],
  ['-(으)ㄹ 뿐만 아니라', 'Means not only but also.', '이 제품은 싸울 뿐만 아니라 품질도 좋아요.', 'This product is not only cheap but also good quality.', ['TOPIK II', 'addition']],
  ['-뿐이다', 'Means only or just.', '제가 원하는 것은 가족의 건강뿐입니다.', 'All I want is my family’s health.', ['TOPIK II', 'limitation']],
  ['-밖에', 'Means nothing but; used with negative forms.', '지금은 만 원밖에 없어요.', 'I have only ten thousand won now.', ['TOPIK I', 'limitation']],
  ['-만 해도', 'Means even just considering.', '작년만 해도 이곳은 조용한 동네였어요.', 'Even just last year, this was a quiet neighborhood.', ['TOPIK II', 'emphasis']],
  ['-에 비해', 'Means compared to.', '작년에 비해 물가가 많이 올랐어요.', 'Prices rose a lot compared to last year.', ['TOPIK II', 'comparison']],
  ['-와/과 달리', 'Means unlike or differently from.', '예상과 달리 시험이 어렵지 않았어요.', 'Unlike expectations, the exam was not difficult.', ['TOPIK II', 'contrast']],
  ['-는 대신에', 'Means instead of or in exchange for.', '차를 사는 대신에 대중교통을 이용해요.', 'I use public transportation instead of buying a car.', ['TOPIK II', 'substitution']],
  ['-(으)ㄴ/는 반면에', 'Contrasts two facts.', '도시는 편리한 반면에 생활비가 비싸요.', 'Cities are convenient, while living costs are high.', ['TOPIK II', 'contrast']],
  ['-(으)ㄴ/는데도', 'Means despite the fact that.', '열심히 공부했는데도 점수가 낮았어요.', 'Although I studied hard, the score was low.', ['TOPIK II', 'concession']],
  ['-아/어도', 'Means even if or although.', '바빠도 식사는 꼭 하세요.', 'Even if you are busy, make sure to eat.', ['TOPIK I', 'concession']],
  ['-더라도', 'Means even if; stronger hypothetical concession.', '실패하더라도 다시 도전하겠습니다.', 'Even if I fail, I will try again.', ['TOPIK II', 'concession']],
  ['-(으)ㄹ지라도', 'Formal form meaning even if.', '어려울지라도 포기하지 않겠습니다.', 'Even if it is difficult, I will not give up.', ['TOPIK II', 'formal']],
  ['-(으)ㄹ망정', 'Means even though; often emphasizes concession.', '늦을망정 꼭 참석하겠습니다.', 'Even if I am late, I will certainly attend.', ['TOPIK II', 'advanced']],
  ['-(으)ㄴ/는 데다가', 'Means in addition to.', '이 집은 넓은 데다가 교통도 편리해요.', 'This house is spacious and, in addition, transportation is convenient.', ['TOPIK II', 'addition']],
  ['-조차', 'Means even; emphasizes an unexpected item.', '그는 쉬운 문제조차 풀지 못했어요.', 'He could not solve even an easy problem.', ['TOPIK II', 'emphasis']],
  ['-마저', 'Means even; often negative or final remaining item.', '비가 오는데 바람마저 강해졌어요.', 'It was raining, and even the wind became strong.', ['TOPIK II', 'emphasis']],
  ['-까지', 'Means even, up to, or until.', '주말까지 일해야 해요.', 'I have to work until the weekend.', ['TOPIK I', 'extent']],
  ['-(으)ㄴ/는 셈이다', 'Means it amounts to or can be considered.', '매일 연습했으니 충분히 준비한 셈이에요.', 'Since I practiced every day, I can be considered well prepared.', ['TOPIK II', 'judgment']],
  ['-(으)ㄴ/는 편이다', 'Means tend to be or be rather.', '저는 아침에 일찍 일어나는 편이에요.', 'I tend to wake up early in the morning.', ['TOPIK II', 'tendency']],
  ['-(으)ㄹ 만하다', 'Means worth doing or bearable.', '이 책은 한번 읽어 볼 만해요.', 'This book is worth reading once.', ['TOPIK II', 'evaluation']],
  ['-(으)ㄹ 법하다', 'Means it is likely or reasonable.', '그 정도 노력했으면 성공할 법해요.', 'With that much effort, it is reasonable that he might succeed.', ['TOPIK II', 'probability']],
  ['-(으)ㄹ 리가 없다', 'Means there is no way that.', '그 사람이 약속을 잊었을 리가 없어요.', 'There is no way that person forgot the appointment.', ['TOPIK II', 'certainty']],
  ['-(으)ㄹ지도 모르다', 'Means might or may.', '내일 비가 올지도 몰라요.', 'It might rain tomorrow.', ['TOPIK II', 'possibility']],
  ['-(으)ㄴ/는 듯하다', 'Means seems like.', '밖에 비가 오는 듯해요.', 'It seems to be raining outside.', ['TOPIK II', 'guess']],
  ['-(으)ㄴ/는 것 같다', 'Means seems like or appears.', '그 사람은 기분이 좋은 것 같아요.', 'That person seems to be in a good mood.', ['TOPIK I', 'guess']],
  ['-나 보다', 'Expresses guess based on evidence.', '불이 꺼져 있는 걸 보니 집에 없나 봐요.', 'Seeing the lights off, I guess no one is home.', ['TOPIK II', 'guess']],
  ['-(으)ㄴ가 보다', 'Expresses supposition.', '사람이 많은 걸 보니 행사가 있나 봐요.', 'Seeing many people, there seems to be an event.', ['TOPIK II', 'guess']],
  ['-(으)ㄴ/는 모양이다', 'Means it looks like based on evidence.', '모두 조용한 걸 보니 회의가 시작된 모양이에요.', 'Seeing everyone quiet, it looks like the meeting has started.', ['TOPIK II', 'guess']],
  ['-(으)ㄹ 것이다', 'Expresses future or strong prediction.', '앞으로 온라인 교육이 더 늘어날 것입니다.', 'Online education will increase more in the future.', ['TOPIK II', 'prediction']],
  ['-(으)ㄹ 예정하다', 'Expresses a planned schedule.', '다음 달에 새 서비스를 시작할 예정입니다.', 'We are scheduled to start a new service next month.', ['TOPIK II', 'plan']],
  ['-(으)ㄹ 계획이다', 'Expresses a plan.', '졸업 후에 대학원에 갈 계획이에요.', 'I plan to go to graduate school after graduation.', ['TOPIK II', 'plan']],
  ['-(으)ㄹ까 하다', 'Expresses a tentative intention.', '이번 주말에는 집에서 쉴까 해요.', 'I am thinking of resting at home this weekend.', ['TOPIK II', 'intention']],
  ['-(으)ㄹ까 봐', 'Means for fear that or worried that.', '늦을까 봐 택시를 탔어요.', 'I took a taxi because I was afraid I would be late.', ['TOPIK II', 'worry']],
  ['-(으)ㄹ 텐데', 'Expresses expectation with background or concern.', '길이 막힐 텐데 일찍 출발하세요.', 'The roads will probably be congested, so leave early.', ['TOPIK II', 'expectation']],
  ['-(으)ㄹ 테니까', 'Gives a reason based on intention or guess.', '제가 자료를 보낼 테니까 확인해 주세요.', 'I will send the materials, so please check them.', ['TOPIK II', 'reason']],
  ['-(으)ㄹ 뿐이다', 'Means only do or merely.', '저는 사실을 말했을 뿐입니다.', 'I merely told the truth.', ['TOPIK II', 'limitation']],
  ['-(으)ㄴ/는 바람에', 'Means because of an unexpected negative event.', '갑자기 비가 오는 바람에 소풍이 취소됐어요.', 'The picnic was canceled because it suddenly rained.', ['TOPIK II', 'cause']],
  ['-느라고', 'Means because one was doing something.', '시험공부를 하느라고 잠을 못 잤어요.', 'I could not sleep because I was studying for the exam.', ['TOPIK II', 'cause']],
  ['-는 김에', 'Means while doing something, take the chance to do another.', '은행에 가는 김에 우체국에도 들렀어요.', 'While going to the bank, I also stopped by the post office.', ['TOPIK II', 'opportunity']],
  ['-(으)ㄴ/는 길에', 'Means on the way to or from.', '퇴근하는 길에 장을 봤어요.', 'I bought groceries on my way home from work.', ['TOPIK II', 'time']],
  ['-자마자', 'Means as soon as.', '집에 도착하자마자 잠이 들었어요.', 'I fell asleep as soon as I arrived home.', ['TOPIK II', 'time']],
  ['-(으)ㄴ 지', 'Expresses time since something happened.', '한국에 온 지 2년이 되었어요.', 'It has been two years since I came to Korea.', ['TOPIK II', 'time']],
  ['-다가', 'Expresses interruption or transition during an action.', '책을 읽다가 전화를 받았어요.', 'I was reading a book and then answered the phone.', ['TOPIK II', 'transition']],
  ['-았/었다가', 'Expresses doing something and then reversing it.', '문을 열었다가 다시 닫았어요.', 'I opened the door and then closed it again.', ['TOPIK II', 'transition']],
  ['-다 보니', 'Means after repeatedly doing something, a result occurs.', '매일 연습하다 보니 실력이 늘었어요.', 'After practicing every day, my skill improved.', ['TOPIK II', 'result']],
  ['-다 보면', 'Means if one keeps doing something.', '꾸준히 하다 보면 좋은 결과가 있을 거예요.', 'If you keep doing it steadily, there will be good results.', ['TOPIK II', 'condition']],
  ['-다가는', 'Warns that continuing an action may cause a bad result.', '그렇게 낭비하다가는 돈이 금방 없어질 거예요.', 'If you keep wasting like that, the money will quickly disappear.', ['TOPIK II', 'warning']],
  ['-고 보니', 'Means after doing something, one realizes.', '알고 보니 그는 제 대학 선배였어요.', 'After finding out, he was my senior from university.', ['TOPIK II', 'realization']],
  ['-고 말다', 'Expresses an unwanted final result.', '결국 약속 시간에 늦고 말았어요.', 'In the end, I was late for the appointment.', ['TOPIK II', 'result']],
  ['-아/어 버리다', 'Expresses completion, often with emotion.', '중요한 파일을 삭제해 버렸어요.', 'I ended up deleting an important file.', ['TOPIK II', 'completion']],
  ['-아/어 놓다', 'Means to do something in advance and leave it that way.', '회의 자료를 미리 준비해 놓았어요.', 'I prepared the meeting materials in advance.', ['TOPIK II', 'preparation']],
  ['-아/어 두다', 'Means to do something in advance for later.', '필요한 정보를 저장해 두세요.', 'Save the necessary information for later.', ['TOPIK II', 'preparation']],
  ['-아/어 내다', 'Expresses successfully completing a difficult action.', '어려운 문제를 끝까지 풀어 냈어요.', 'I managed to solve the difficult problem to the end.', ['TOPIK II', 'achievement']],
  ['-아/어 가다', 'Expresses gradual progress away from present.', '도시의 모습이 조금씩 변해 가고 있어요.', 'The city is gradually changing.', ['TOPIK II', 'progress']],
  ['-아/어 오다', 'Expresses continuation up to now.', '그 전통은 오랫동안 이어져 왔어요.', 'That tradition has continued for a long time.', ['TOPIK II', 'continuation']],
  ['-(으)ㄴ 채로', 'Means while remaining in a state.', '창문을 연 채로 잠을 잤어요.', 'I slept with the window open.', ['TOPIK II', 'state']],
  ['-(으)ㄴ/는 대로', 'Means as soon as or according to.', '준비가 끝나는 대로 연락드리겠습니다.', 'I will contact you as soon as preparation is finished.', ['TOPIK II', 'sequence']],
  ['-(으)ㄴ/는 만큼', 'Means as much as or since.', '노력한 만큼 좋은 결과가 나올 거예요.', 'Good results will come as much as you worked hard.', ['TOPIK II', 'degree']],
  ['-(으)ㄴ/는 척하다', 'Means to pretend.', '그는 모르는 척했어요.', 'He pretended not to know.', ['TOPIK II', 'pretense']],
  ['-(으)ㄴ/는 체하다', 'Means to pretend; similar to 척하다.', '그 사람은 바쁜 체했어요.', 'That person pretended to be busy.', ['TOPIK II', 'pretense']],
  ['-(으)ㄹ 뻔하다', 'Means almost happened.', '계단에서 넘어질 뻔했어요.', 'I almost fell on the stairs.', ['TOPIK II', 'near miss']],
  ['-(으)ㄹ수록', 'Means the more, the more.', '생각할수록 좋은 방법인 것 같아요.', 'The more I think about it, the more it seems like a good method.', ['TOPIK II', 'degree']],
  ['-(으)면 -(으)ㄹ수록', 'Emphasizes increasing degree.', '연습하면 할수록 발음이 좋아져요.', 'The more you practice, the better your pronunciation becomes.', ['TOPIK II', 'degree']],
  ['-기 마련이다', 'Means something is natural or bound to happen.', '노력하면 결과가 좋아지기 마련이에요.', 'If you work hard, results are bound to improve.', ['TOPIK II', 'general truth']],
  ['-기 쉽다', 'Means it is easy to do or likely to happen.', '겨울에는 감기에 걸리기 쉬워요.', 'It is easy to catch a cold in winter.', ['TOPIK II', 'possibility']],
  ['-기 어렵다', 'Means it is difficult to do.', '이 문제는 혼자 해결하기 어려워요.', 'This problem is difficult to solve alone.', ['TOPIK II', 'difficulty']],
  ['-기보다는', 'Means rather than doing.', '택시를 타기보다는 지하철을 이용하세요.', 'Use the subway rather than taking a taxi.', ['TOPIK II', 'comparison']],
  ['-기만 하면', 'Means whenever or once only something happens.', '버튼을 누르기만 하면 자동으로 시작됩니다.', 'It starts automatically as soon as you press the button.', ['TOPIK II', 'condition']],
  ['-기는 하지만', 'Means although it is true that.', '비싸기는 하지만 품질은 좋아요.', 'Although it is expensive, the quality is good.', ['TOPIK II', 'contrast']],
  ['-기는커녕', 'Means far from; not even.', '사과하기는커녕 오히려 화를 냈어요.', 'Far from apologizing, he got angry instead.', ['TOPIK II', 'advanced']],
  ['-기에', 'Formal reason marker.', '날씨가 좋기에 산책을 나갔습니다.', 'Since the weather was good, I went out for a walk.', ['TOPIK II', 'formal']],
  ['-길래', 'Reason based on observed situation.', '밖이 조용하길래 모두 퇴근한 줄 알았어요.', 'Because it was quiet outside, I thought everyone had left work.', ['TOPIK II', 'reason']],
  ['-(으)로서', 'Means as a status or qualification.', '부모로서 아이의 안전을 책임져야 합니다.', 'As parents, we must be responsible for children’s safety.', ['TOPIK II', 'qualification']],
  ['-(으)로써', 'Means by means of.', '대화를 함으로써 오해를 풀 수 있어요.', 'Misunderstandings can be resolved by having a conversation.', ['TOPIK II', 'means']],
  ['-에 따르면', 'Means according to.', '조사에 따르면 청년 실업률이 증가했습니다.', 'According to the survey, youth unemployment increased.', ['TOPIK II', 'source']],
  ['-에 의하면', 'Formal expression meaning according to.', '전문가에 의하면 충분한 수면이 중요합니다.', 'According to experts, enough sleep is important.', ['TOPIK II', 'source']],
  ['-에 대한', 'Means about or regarding.', '환경 문제에 대한 관심이 높아지고 있어요.', 'Interest in environmental problems is increasing.', ['TOPIK II', 'topic']],
  ['-에 관한', 'Means concerning or about.', '한국 문화에 관한 책을 읽고 있어요.', 'I am reading a book about Korean culture.', ['TOPIK II', 'topic']],
].map(([pattern, description, ko, en, tags]) => ({
  pattern: String(pattern),
  description: String(description),
  examples_json: [{ ko: String(ko), en: String(en) }],
  tags_json: tags as string[],
}));

const appliedStems = [
  { ko: '증가하다', en: 'increase', noun: '인터넷 사용 시간을' },
  { ko: '감소하다', en: 'decrease', noun: '종이 사용량을' },
  { ko: '변화하다', en: 'change', noun: '소비자의 태도를' },
  { ko: '발전하다', en: 'develop', noun: '의료 기술을' },
  { ko: '개선하다', en: 'improve', noun: '교통 환경을' },
  { ko: '보호하다', en: 'protect', noun: '개인 정보를' },
  { ko: '관리하다', en: 'manage', noun: '건강 상태를' },
  { ko: '지원하다', en: 'support', noun: '청년 창업을' },
  { ko: '참여하다', en: 'participate', noun: '지역 행사에' },
  { ko: '해결하다', en: 'solve', noun: '사회 문제를' },
  { ko: '선택하다', en: 'choose', noun: '진로를' },
  { ko: '활용하다', en: 'utilize', noun: '디지털 자료를' },
  { ko: '분석하다', en: 'analyze', noun: '조사 결과를' },
  { ko: '비교하다', en: 'compare', noun: '두 제도를' },
  { ko: '예측하다', en: 'predict', noun: '미래 변화를' },
  { ko: '강조하다', en: 'emphasize', noun: '교육의 중요성을' },
  { ko: '제안하다', en: 'suggest', noun: '새로운 방법을' },
  { ko: '도입하다', en: 'introduce', noun: '새 제도를' },
  { ko: '유지하다', en: 'maintain', noun: '전통 문화를' },
  { ko: '확대하다', en: 'expand', noun: '복지 정책을' },
  { ko: '축소하다', en: 'reduce', noun: '불필요한 비용을' },
  { ko: '평가하다', en: 'evaluate', noun: '정책의 효과를' },
  { ko: '고려하다', en: 'consider', noun: '환경적 영향을' },
  { ko: '인정하다', en: 'acknowledge', noun: '차이를' },
  { ko: '극복하다', en: 'overcome', noun: '어려움을' },
  { ko: '공유하다', en: 'share', noun: '정보를' },
  { ko: '협력하다', en: 'cooperate', noun: '다른 기관과' },
  { ko: '경험하다', en: 'experience', noun: '문화 차이를' },
  { ko: '관찰하다', en: 'observe', noun: '시장 변화를' },
  { ko: '실천하다', en: 'put into practice', noun: '환경 보호를' },
];

const appliedPatterns = [
  {
    suffix: '-기 쉽다',
    description: 'Applied grammar card for saying that something is easy or likely to happen.',
    ko: (stem: string, noun: string) => `${noun} 제대로 관리하지 않으면 ${stem.replace('하다', '하기')} 쉽습니다.`,
    en: (meaning: string) => `It is easy to ${meaning} if it is not properly managed.`,
    tag: 'possibility',
  },
  {
    suffix: '-기 어렵다',
    description: 'Applied grammar card for saying that an action is difficult.',
    ko: (stem: string, noun: string) => `${noun} 단기간에 ${stem.replace('하다', '하기')} 어렵습니다.`,
    en: (meaning: string) => `It is difficult to ${meaning} in a short time.`,
    tag: 'difficulty',
  },
  {
    suffix: '-기 위해서',
    description: 'Applied grammar card for expressing purpose.',
    ko: (stem: string, noun: string) => `${noun} ${stem.replace('하다', '하기')} 위해서 구체적인 계획이 필요합니다.`,
    en: (meaning: string) => `A concrete plan is needed in order to ${meaning}.`,
    tag: 'purpose',
  },
  {
    suffix: '-도록',
    description: 'Applied grammar card for expressing purpose or desired result.',
    ko: (stem: string, noun: string) => `${noun} 효과적으로 ${stem.replace('하다', '하도')}록 모두가 노력해야 합니다.`,
    en: (meaning: string) => `Everyone should make effort so that they can effectively ${meaning}.`,
    tag: 'purpose',
  },
  {
    suffix: '-게 되다',
    description: 'Applied grammar card for describing a change or result.',
    ko: (stem: string, noun: string) => `사회가 변하면서 ${noun} 더 적극적으로 ${stem.replace('하다', '하게')} 되었습니다.`,
    en: (meaning: string) => `As society changed, people came to ${meaning} more actively.`,
    tag: 'change',
  },
  {
    suffix: '-는 편이다',
    description: 'Applied grammar card for expressing a tendency.',
    ko: (stem: string, noun: string) => `최근 사람들은 ${noun} 적극적으로 ${stem.replace('하다', '하는')} 편입니다.`,
    en: (meaning: string) => `Recently, people tend to actively ${meaning}.`,
    tag: 'tendency',
  },
  {
    suffix: '-는 대신에',
    description: 'Applied grammar card for expressing replacement or trade-off.',
    ko: (stem: string, noun: string) => `${noun} 무조건 ${stem.replace('하다', '하는')} 대신에 장단점을 따져 봐야 합니다.`,
    en: (meaning: string) => `Instead of blindly trying to ${meaning}, one should consider pros and cons.`,
    tag: 'substitution',
  },
  {
    suffix: '-는 데 도움이 되다',
    description: 'Applied grammar card for saying something helps with an action.',
    ko: (stem: string, noun: string) => `꾸준한 관심은 ${noun} ${stem.replace('하다', '하는')} 데 도움이 됩니다.`,
    en: (meaning: string) => `Steady interest helps with trying to ${meaning}.`,
    tag: 'usefulness',
  },
  {
    suffix: '-는 과정에서',
    description: 'Applied grammar card for describing something happening during a process.',
    ko: (stem: string, noun: string) => `${noun} ${stem.replace('하다', '하는')} 과정에서 예상하지 못한 문제가 생겼습니다.`,
    en: (meaning: string) => `Unexpected problems occurred in the process of trying to ${meaning}.`,
    tag: 'process',
  },
  {
    suffix: '-는 만큼',
    description: 'Applied grammar card for expressing degree or basis.',
    ko: (stem: string, noun: string) => `${noun} ${stem.replace('하다', '하는')} 만큼 책임감도 필요합니다.`,
    en: (meaning: string) => `As much as one tries to ${meaning}, responsibility is also needed.`,
    tag: 'degree',
  },
  {
    suffix: '-는 데 비해',
    description: 'Applied grammar card for expressing comparison.',
    ko: (stem: string, noun: string) => `${noun} ${stem.replace('하다', '하는')} 데 비해 효과는 아직 크지 않습니다.`,
    en: (meaning: string) => `Compared to efforts to ${meaning}, the effect is not yet large.`,
    tag: 'comparison',
  },
  {
    suffix: '-는 반면에',
    description: 'Applied grammar card for contrasting two facts.',
    ko: (stem: string, noun: string) => `${noun} ${stem.replace('하다', '하면')} 편리한 반면에 비용이 들 수 있습니다.`,
    en: (meaning: string) => `While it can be convenient to ${meaning}, it may cost money.`,
    tag: 'contrast',
  },
  {
    suffix: '-더라도',
    description: 'Applied grammar card for expressing concession.',
    ko: (stem: string, noun: string) => `시간이 오래 걸리더라도 ${noun} 꾸준히 ${stem.replace('하다', '해야')} 합니다.`,
    en: (meaning: string) => `Even if it takes a long time, one should steadily ${meaning}.`,
    tag: 'concession',
  },
  {
    suffix: '-고자 하다',
    description: 'Applied grammar card for formal intention, common in TOPIK II writing.',
    ko: (stem: string, noun: string) => `정부는 ${noun} ${stem.replace('하다', '하고')}자 새로운 정책을 마련했습니다.`,
    en: (meaning: string) => `The government prepared a new policy in order to ${meaning}.`,
    tag: 'formal writing',
  },
  {
    suffix: '-기 마련이다',
    description: 'Applied grammar card for expressing a natural or expected result.',
    ko: (stem: string, noun: string) => `${noun} 꾸준히 ${stem.replace('하다', '하면')} 좋은 결과가 나타나기 마련입니다.`,
    en: (meaning: string) => `If one steadily tries to ${meaning}, good results are bound to appear.`,
    tag: 'general truth',
  },
];

function buildGrammarItems() {
  const items = new Map<string, GrammarItem>();
  const add = (item: GrammarItem) => {
    items.set(item.pattern, item);
  };

  grammarItems.forEach(add);

  for (const stem of appliedStems) {
    for (const pattern of appliedPatterns) {
      if (items.size >= 400) break;

      add({
        pattern: `${stem.ko} ${pattern.suffix}`,
        description: pattern.description,
        examples_json: [
          {
            ko: pattern.ko(stem.ko, stem.noun),
            en: pattern.en(stem.en),
          },
        ],
        tags_json: ['TOPIK II', 'applied grammar', pattern.tag],
      });
    }
  }

  const result = [...items.values()].slice(0, 400);
  if (result.length !== 400) {
    throw new Error(`Expected 400 grammar items, got ${result.length}`);
  }

  return result;
}

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const url = new URL(connectionString);
  if (url.protocol === 'mysql:') {
    url.protocol = 'mariadb:';
  }

  if (!url.searchParams.has('allowPublicKeyRetrieval')) {
    url.searchParams.set('allowPublicKeyRetrieval', 'true');
  }

  return url.toString();
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(getConnectionString()),
});

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function importGrammar() {
  const selectedGrammarItems = buildGrammarItems();

  const patterns = selectedGrammarItems.map((item) => item.pattern);
  const now = BigInt(Date.now());

  await prisma.user_grammar_items.deleteMany({
    where: {
      grammar_items: {
        pattern: { notIn: patterns },
      },
    },
  });
  await prisma.grammar_items.deleteMany({
    where: { pattern: { notIn: patterns } },
  });

  for (const patternChunk of chunk(patterns, 50)) {
    await prisma.user_grammar_items.deleteMany({
      where: {
        grammar_items: {
          pattern: { in: patternChunk },
        },
      },
    });
    await prisma.grammar_items.deleteMany({
      where: { pattern: { in: patternChunk } },
    });
  }

  for (const itemChunk of chunk(selectedGrammarItems, 50)) {
    await prisma.grammar_items.createMany({
      data: itemChunk.map((item) => ({
        pattern: item.pattern,
        description: item.description,
        examples_json: item.examples_json,
        tags_json: item.tags_json,
        is_downloaded: 0,
        updated_at: now,
      })),
    });
  }

  return prisma.grammar_items.count({
    where: { pattern: { in: patterns } },
  });
}

async function main() {
  const inserted = await importGrammar();

  console.log('Grammar content import completed.');
  console.log(JSON.stringify({ inserted }, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

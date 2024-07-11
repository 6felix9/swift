import Groq from "groq-sdk";
import { headers } from "next/headers";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { unstable_after as after } from "next/server";

const groq = new Groq();

const schema = zfd.formData({
	input: z.union([zfd.text(), zfd.file()]),
	message: zfd.repeatableOfType(
		zfd.json(
			z.object({
				role: z.enum(["user", "assistant"]),
				content: z.string(),
			})
		)
	),
});


export async function POST(request: Request) {
	console.time("transcribe " + request.headers.get("x-vercel-id") || "local");

	const { data, success } = schema.safeParse(await request.formData());
	if (!success) return new Response("Invalid request", { status: 400 });

	const transcript = await getTranscript(data.input);
	if (!transcript) return new Response("Invalid audio", { status: 400 });
	console.log(transcript);

	console.timeEnd(
		"transcribe " + request.headers.get("x-vercel-id") || "local"
	);
	console.time(
		"text completion " + request.headers.get("x-vercel-id") || "local"
	);

	const completion = await groq.chat.completions.create({
		model: "gemma2-9b-it",
		messages: [
			{
				role: "system",
				content: `- You are Lisa, a friendly and helpful voice assistant of NHG Cares (National Healthcare Group) Medication Delivery Hotline.
- Respond briefly to the user's request, and do not provide unnecessary information.
- If you don't understand the user's request, ask for clarification.
- You do not have access to up-to-date information, so you should not provide real-time data.
- You are not capable of performing actions other than responding to the user.
- Do not use markdown, emojis, or other formatting in your responses. Respond in a way easily spoken by text-to-speech software.
- The current time is ${time()}.
- 如果用户用中文提问，请用中文回答
Knowledge Base:
`+ content,
			},
			...data.message,
			{
				role: "user",
				content: transcript,
			},
		],
	});

	const response = completion.choices[0].message.content;
	console.timeEnd(
		"text completion " + (request.headers.get("x-vercel-id") || "local")
	);

	console.time(
		"cartesia request " + (request.headers.get("x-vercel-id") || "local")
	);

	const voice = await fetch("https://api.cartesia.ai/tts/bytes", {
		method: "POST",
		headers: {
			"Cartesia-Version": "2024-06-30",
			"Content-Type": "application/json",
			"X-API-Key": process.env.CARTESIA_API_KEY!,
		},
		body: JSON.stringify({
			model_id: "sonic-english",
			// model_id: "sonic-multilingual",
			transcript: response,
			voice: {
				mode: "embedding",
				embedding,
			},
			output_format: {
				container: "raw",
				encoding: "pcm_f32le",
				sample_rate: 24000,
			},
		}),
	});

	console.timeEnd(
		"cartesia request " + (request.headers.get("x-vercel-id") || "local")
	);

	if (!voice.ok) {
		console.error(await voice.text());
		return new Response("Voice synthesis failed", { status: 500 });
	}

	console.time("stream " + (request.headers.get("x-vercel-id") || "local"));
	after(() => {
		console.timeEnd(
			"stream " + (request.headers.get("x-vercel-id") || "local")
		);
	});

	return new Response(voice.body, {
		headers: {
			"X-Transcript": encodeURIComponent(transcript),
			"X-Response": encodeURIComponent(response!),
		},
	});
}

function time() {
	return new Date().toLocaleString("en-US", {
		timeZone: headers().get("x-vercel-ip-timezone") || undefined,
	});
}

async function getTranscript(input: string | File) {
	if (typeof input === "string") return input;

	try {
		const { text } = await groq.audio.transcriptions.create({
			file: input,
			model: "whisper-large-v3",
			language: "en",
		});

		return text.trim() || null;
	} catch {
		return null; // Empty audio file
	}
}

// This is the embedding for the voice we're using
// Cartesia doesn't cache the voice ID, so providing the embedding is quicker
// const embedding = [
// 	0.028491372, -0.1391638, -0.115689054, 0.014934053, 0.031380747,
// 	0.032840155, -0.13981827, -0.110673204, 0.03666089, 0.020444114,
// 	-0.0098732505, -0.000047919486, -0.027173962, -0.1384901, 0.022342375,
// 	-0.015293258, 0.039458044, -0.038734823, -0.03641128, 0.02560386,
// 	0.04175228, 0.04053904, -0.09689661, 0.049731854, -0.043193243,
// 	-0.033240672, 0.029257176, 0.006319825, -0.046594825, -0.06826011,
// 	-0.06279957, 0.08607602, -0.14586939, 0.15763284, 0.1435775, -0.012875012,
// 	0.15013453, -0.095192775, -0.084795915, 0.021333126, 0.118830785,
// 	0.03697425, -0.06727533, -0.034030415, 0.086969115, -0.14228137,
// 	-0.0029569226, -0.035011604, -0.060441177, -0.003498052, 0.04654444,
// 	0.021769566, 0.066677414, 0.023351913, -0.029204022, -0.033712972,
// 	0.09552891, -0.030530509, 0.19085395, 0.07190502, -0.03928957, -0.15640728,
// 	-0.019417219, 0.05686844, -0.0364809, -0.12735741, 0.098057866,
// 	-0.034268208, 0.026743805, -0.029582117, -0.07457926, 0.10608794,
// 	0.022039559, -0.011393202, -0.026265213, -0.08031903, -0.1440034,
// 	0.09673453, 0.054594047, 0.002669445, 0.0033345232, 0.009314972, -0.1443995,
// 	0.11834314, -0.12666178, -0.113075584, -0.11439861, 0.007842917,
// 	0.047062688, 0.08192675, 0.101306245, -0.022347892, -0.045984715,
// 	-0.032215152, -0.083271995, -0.0389151, 0.053191308, -0.048629716,
// 	0.05291833, 0.11321043, 0.019934122, 0.04242131, -0.04702718, 0.05472134,
// 	0.0037030247, 0.033969734, 0.041244056, -0.07488608, 0.051269654,
// 	0.00040629698, 0.023166113, 0.09475082, -0.036998134, -0.057446104,
// 	-0.18413536, 0.0007626198, 0.0053934916, 0.013763193, -0.07379074,
// 	0.013177856, 0.09163241, 0.0028229496, 0.02326876, -0.076565966,
// 	0.0005429262, -0.018847227, -0.085090205, -0.13184647, -0.0145582035,
// 	-0.06878027, -0.019886322, -0.010282109, 0.026955104, 0.034066472,
// 	0.053368922, 0.10024289, 0.1092495, -0.011000435, -0.17337179, -0.08550435,
// 	0.03365507, -0.029914645, -0.065959826, -0.05280391, 0.05858872,
// 	0.035207685, -0.0018503272, -0.037308946, 0.04193502, 0.03442309,
// 	0.07527269, 0.005446172, -0.021133725, -0.011251428, -0.015058635,
// 	0.015856266, -0.053730056, 0.042547293, -0.017108614, -0.012849737,
// 	0.011148464, 0.06922335, 0.058953118, 0.09268027, 0.04320933, 0.000595642,
// 	0.028268352, 0.053375594, 0.08590455, 0.06273071, 0.14364797, 0.12060001,
// 	0.024742233, -0.03915045, -0.08283723, -0.03954623, 0.032926064,
// 	-0.022450564, 0.03212572, -0.07087819, -0.107691385, -0.034049273,
// 	-0.0062783766, -0.0090122605, -0.09306727, 0.0014946258, -0.0002146328,
// 	-0.03745981, 0.011419688, -0.07650551, -0.11179312, -0.03491727,
// ];

// Lisa's embedding
// 72f4f1e4-a518-4146-bdc3-26778714938e
const embedding = [0.053335402,0.040723275,0.095070496,0.04612898,-0.040415186,-0.024526533,0.0038791469,-0.0693032,-0.05061066,0.06714187,0.014044946,-0.12459722,0.007850415,0.0727567,0.10363255,0.11543881,-0.05816769,0.027838876,-0.13226773,0.011474253,0.07155212,0.025224024,-0.101778105,0.03370049,0.01812782,-0.13724892,-0.012013529,-0.09731443,0.071007125,0.020084215,-0.052169945,0.022457251,-0.035369463,-0.025319086,0.07073239,0.02188904,-0.001315877,0.04959787,0.018116318,-0.1326624,-0.0017887463,-0.043159135,0.0020428766,-0.05595786,-0.027367154,0.08462613,0.0036674852,0.15948413,-0.034129374,-0.03482761,-0.12254311,-0.16506946,-0.058573175,-0.015069416,0.06137133,-0.04618798,0.039377876,-0.09357923,0.08260871,-0.01611893,-0.06642402,-0.010061468,0.09910285,-0.077892765,-0.05534078,0.086671144,0.09717027,-0.030122766,-0.02749938,-0.012587613,0.0328537,-0.11958388,0.061214387,0.0467467,-0.0053076115,-0.103056155,-0.029321212,-0.013984351,-0.08299066,-0.027478646,-0.0014340563,0.026786946,-0.018760113,0.10860226,-0.01970218,-0.05735887,-0.06143076,0.032291196,0.016500408,0.11283628,-0.12876669,-0.046514712,0.019964136,-0.03112589,-0.15926398,0.06648302,0.09251432,-0.1321702,-0.006415075,0.043133464,-0.018101892,0.13910095,-0.034218278,0.0758932,-0.04820207,0.03998792,0.11817196,0.013520355,0.04935764,0.060694557,-0.039373603,0.085367605,-0.021448778,-0.03933982,0.051853776,0.061526787,0.025322216,-0.04033939,0.0864019,0.07411416,0.05604737,-0.037618607,-0.014207145,-0.045788772,-0.063538365,0.08742272,-0.050500527,-0.14979634,-0.09277631,0.00017483594,0.020475272,-0.009111821,-0.034240913,-0.10149684,0.11524047,0.0670058,0.02894256,-0.06798803,-0.22073762,0.022633472,-0.059059557,0.011923614,-0.0049547534,-0.027577562,0.14307551,-0.12198728,0.043582253,-0.00045167748,-0.0090593,0.021791443,0.024039306,0.04741764,0.0748579,0.030820519,0.016614601,0.04157558,0.11780483,-0.14710324,0.121583536,-0.03087404,-0.024145316,-0.039819464,0.020204468,0.027058141,-0.080414355,0.16938198,0.13669237,-0.06755987,0.012854296,-0.115054965,-0.017123835,-0.044812065,-0.03013185,-0.06441554,-0.112958096,-0.20103541,-0.0005380553,0.045291673,-0.029356683,0.030156454,0.1026622,-0.056779947,0.014333967,0.048426803,0.07618453,-0.0049921097,-0.1495471,-0.03774571,0.00988242,-0.05431732,-0.026880832,0.042601332];

// const embedding = [-0.028540831,0.12779823,-0.0502564,-0.07005005,-0.0019730926,-0.09062734,-0.04907511,-0.062099855,-0.033881526,0.085482426,0.04439756,-0.04148573,-0.012800658,0.027863279,0.07666428,0.09239387,0.099358544,0.0688619,-0.006169549,-0.018596353,0.039300688,0.052618135,0.07095731,0.035128493,0.027188944,-0.1510592,-0.07503962,-0.013050899,-0.057943285,-0.09691286,0.004159294,0.029978659,0.055113632,0.03342301,-0.02762559,0.115161195,0.013509776,0.05198786,-0.06510508,-0.064943165,0.0053234673,-0.044889867,-0.07484346,0.05440422,0.016369939,0.15603165,0.060759492,0.093632475,-0.06603086,-0.04382697,-0.108023874,-0.0066286684,-0.06822766,0.07116806,-0.09220518,-0.088111885,0.09528035,-0.035807554,0.053123236,-0.033190757,-0.06774796,-0.16172345,-0.019878944,0.0075074495,-0.019767899,0.060064584,0.099997155,-0.08241618,-0.04590206,0.080044396,-0.056886178,-0.07566712,-0.11280815,0.12602578,-0.021818351,-0.035790212,-0.013964617,0.0064696004,-0.1044694,-0.081354916,0.029244578,0.09180858,0.038088433,-0.09680267,0.034650825,-0.027147412,0.05485094,0.010804856,0.03546792,0.11777048,-0.108961426,0.052133735,-0.03572588,0.08249622,-0.1842164,-0.01719152,-0.0073506646,-0.047045503,0.025203373,-0.066718906,0.0031464656,0.012956721,0.035726566,0.031927377,0.11425182,-0.023962598,0.024417244,-0.023179062,0.044769946,0.16541354,-0.045537848,0.041448902,-0.018287852,-0.057089552,0.089455165,0.049917657,0.004950255,0.14933155,-0.10772962,0.04566092,0.01679632,0.051961835,-0.027447017,-0.06706145,-0.011699031,0.030505657,-0.011401047,-0.15730484,-0.06035374,-0.05516474,-0.018102743,0.19218811,0.019138416,-0.029297033,0.024527058,0.059552982,0.047270235,-0.042378247,-0.07559329,0.10617836,0.07463044,-0.0045791077,-0.048760578,0.05586124,0.088820145,-0.045641433,0.011255467,-0.038737897,0.060005978,-0.026151393,0.03458473,0.13044222,-0.03746807,0.07827326,0.064602606,-0.034991276,-0.0011483744,-0.07744512,-0.12509044,0.012602635,-0.03442947,-0.12310453,-0.08256725,0.018231919,0.059376337,0.20028678,0.044426113,0.057241563,0.017762972,0.05484631,0.03908057,-0.065480135,0.05504503,0.024182929,-0.0060231676,-0.23040056,0.055594943,0.094758645,0.088303536,0.13807338,0.039965823,-0.048554894,0.06354867,-0.022436328,-0.05075478,-0.016135952,-0.065245934,-0.106605485,0.12136131,-0.055431817,-0.0109024355,0.015113478]

// const embedding = [0.015074719,0.07815816,0.0070176264,0.16148934,0.02821382,0.017641485,0.07926013,-0.03915134,-0.041134354,0.042160876,-0.017859686,-0.0695668,0.042478297,-0.09401953,0.106531456,0.09191093,-0.005100358,0.015656427,0.011675262,-0.08263662,0.15436542,0.027188584,0.18645853,-0.06759048,-0.046964157,-0.17963608,-0.060492143,-0.05606165,0.03892869,0.04966233,-0.060949326,-0.10716214,-0.013377218,0.1213634,0.089230075,0.14822355,0.09833725,0.025637476,-0.0402112,-0.018856289,-0.09068811,0.017749226,-0.05701087,-0.09751774,0.0317749,-0.06716045,0.07821902,0.020343676,0.02698185,-0.005284817,-0.09826862,0.09978882,0.06794861,-0.043161973,-0.003265836,-0.03731951,0.03243135,0.17782748,-0.0068103634,-0.05118441,0.03689297,0.04949296,-0.054711133,0.018371014,0.07774565,0.12018204,0.017835751,0.03111903,0.107871234,0.04558636,-0.03804954,0.017292028,-0.022965657,-0.102884464,0.059495986,-0.058679286,0.006496019,-0.015532109,-0.0126976445,0.015150226,-0.04431741,0.068289034,0.055370223,-0.074062645,0.050563306,-0.20702636,-0.004227823,-0.04946892,0.0364956,-0.02915149,-0.052553304,0.019482432,0.057798393,-0.044107582,-0.026371628,-0.05701309,-0.03653416,-0.051964663,0.085146144,-0.109704755,-0.010264873,-0.07041413,-0.086388215,0.11597416,0.051247425,0.10430774,0.01904306,-0.053876556,-0.026709007,0.16802691,0.03449131,-0.024467656,0.029929746,-0.048322916,0.17306721,0.09010968,-0.0051653846,-0.029199723,-0.08610647,0.075202055,-0.056064982,-0.03386193,-0.037017282,0.06547183,-0.016356803,0.038786743,-0.062000643,0.028303087,-0.03210626,-0.10561723,-0.0396778,-0.019272255,0.058603086,0.014972963,0.10618212,-0.17059128,-0.044520758,-0.020127553,0.0025602714,0.08810745,0.1586115,0.07715063,-0.051984042,-0.0632786,0.06933983,-0.10371952,-0.053783722,0.032655746,0.017360436,-0.10440338,0.013905543,0.064294584,-0.016934376,0.007312398,0.07726825,-0.074045025,-0.047631886,-0.058520745,-0.02202315,0.008835776,-0.052839763,0.06722444,0.019113047,0.058557857,-0.07646019,0.13005431,0.037960045,-0.06507655,0.029930994,0.033065755,-0.046691786,-0.15211298,-0.090538904,0.10492793,-0.056069043,-0.08595548,-0.04532133,-0.041375972,0.12970676,0.00015989355,0.011833073,-0.04561534,0.015547222,-0.076443546,-0.10630566,-0.0062786415,-0.104276784,0.045597196,-0.008646813,0.027917137,-0.097158246,0.07325887];

// Alan's embedding
// const embedding = [0.042624246,0.04615284,-0.023767306,0.0366912,-0.09138904,0.037114296,-0.036309484,0.012092725,-0.015035345,0.118337795,-0.03304645,0.12530588,0.0055466876,-0.08273882,0.09655002,-0.033103306,-0.19778651,0.055487715,-0.057493303,-0.038748316,0.02696802,0.04517483,-0.023253247,0.07982799,-0.038257573,-0.00090891734,0.021778304,0.014623506,-0.12531656,-0.08053798,-0.03597522,-0.011008716,0.07445766,-0.0038033614,0.042065453,0.003986374,-0.070334405,-0.01682483,0.2289159,0.018871393,0.13344821,-0.045759745,0.14223592,0.046270236,0.036200024,-0.0107966,-0.116213135,0.023069697,0.07884119,-0.10209519,0.089378715,-0.06243434,-0.026288707,0.096046165,-0.053391412,0.1721951,0.08934209,-0.06723885,0.042029575,-0.031417042,-0.063861005,-0.044689033,-0.14004526,0.083212614,0.026904294,0.03174201,0.06882005,-0.0024479276,-0.052834447,-0.05944476,-0.023327628,-0.0777317,0.0012650971,-0.012113835,-0.052304454,0.07673962,-0.009012772,0.0028259566,-0.056567267,-0.071539216,-0.11197288,-0.05127067,-0.0826814,-0.08312448,-0.1775882,-0.049119335,0.06451121,0.11973366,0.096214,-0.05982499,0.013652906,0.045357466,0.05890661,-0.033338483,0.18424001,0.050805964,-0.0019592561,0.0664777,0.012702168,0.089221135,-0.09987918,-0.06414534,0.028983634,-0.027339308,0.036934786,0.12682188,0.072277054,0.054777414,0.086254545,0.009493991,-0.1366883,0.07235857,0.001694511,-0.17648382,-0.009519694,-0.0069077667,0.08792339,-0.030934097,-0.07546381,-0.08112527,0.00938915,0.024511237,0.07173502,0.09890406,-0.018565739,-0.048626784,0.01380175,-0.06764486,0.008967038,0.1289667,-0.008302095,-0.12079842,0.01933087,-0.000014918415,0.06579783,0.13984254,-0.10308437,-0.010241321,0.023323333,-0.053101458,0.031426292,-0.000017345965,0.03901658,-0.065043695,-0.020599911,-0.09391135,-0.010057529,-0.008105399,0.011940175,0.097235136,0.02268942,-0.10037939,0.0061694854,0.03160607,0.046712294,-0.026791174,0.08303689,-0.014884069,-0.033972267,-0.08475334,0.010760966,0.057436105,-0.064664766,-0.061196852,0.048787948,-0.002265865,-0.1522658,0.018796146,0.009594236,0.020709528,0.062710956,-0.10287874,-0.07918992,0.01014162,0.0031057901,-0.11542992,-0.043033015,-0.044810306,0.0061242585,-0.083331086,0.009365516,0.063411064,-0.00925298,-0.03567631,0.06515571,0.01747813,0.14059132,-0.11362076,0.09173956,0.020454692,-0.0826133,-0.09400656];

const content = `- What is Healthier SG?
	- Why does Healthier SG need to be launched soon(in second half of 2023)?
	- Healthier SG is a multi-year strategy to transform our healthcare system to focus more on
	  preventive care, and empower individuals to take steps towards better health.  
	- We have embarked on Healthier SG in view of the rising pressure from our ageing population
	  and increasing chronic disease burden. Investing in preventive care will help to delay onset of  
	  illnesses and better manage existing illness to prevent deterioration, and this in turn extend  
	  the number of years we live in good health.  
	- Under Healthier SG, we will support you to:
	  • Take charge of your own health with a trusted Healthier SG clinic  
	  • Act on your Health Plan  
	  • Participate in a wide range of community programmes to stay healthy  
	  So, TAP into a healthier you, with Healthier SG today!  
- What can I expect from Healthier SG?
	- To start and be a part of Healthier SG, it only takes 3 simple steps:
		- 1. Enrol in Healthier SG via HealthHub
		  Eligible residents will receive an SMS invitation from MOH to enrol in Healthier  
		  SG on HealthHub. You can then choose your preferred Healthier SG clinic* and  
		  make an appointment for your first consultation. You will also be asked to  
		  complete an onboarding questionnaire before you see your doctor.  
		  Note: Healthier SG clinic refers to both General Practitioner (GP) clinics and  
		  polyclinics  
		- 2. See your preferred Healthier SG clinic for your first consultation
		  Upon enrolment,you will need to complete an onboarding questionnaire. The  
		  first consultation will be free, and the family doctor will assess your medical  
		  history, health needs and concerns from the onboarding questionnaire during  
		  the consultation.  
		- 3. Work together with your Healthier SG clinic on a personalised Health Plan
		  The family doctor will co-develop a personalised Health Plan with you, and  
		  provide appropriate preventive measures or follow up management including –  
		  but not limited to - lifestyle adjustments, as well as nationally recommended  
		  health screenings and vaccinations that will be fully subsidised by the  
		  Government.  
		  There will also be annual check-ins with your doctor (at least once a year or  
		  more frequently depending on your medical condition and progress).  
	- With Healthier SG, you will receive:
	  · Full subsidies for nationally recommended screenings and vaccinations  
	  · Care and guidance on preventive care steps to avoid critical illnesses  
	  · Rewards through the Healthpoints system in the Healthy 365 application  
- When can I enrol in Healthier SG? Is it compulsory for Singaporeans to join Healthier SG?
	- The Healthier SG (HSG) national enrolment programme will be rolled out in phases from 5 July
	  2023 onwards. Enrolment is not mandatory however, we strongly encourage you to enrol with  
	  a HSG clinic so that the family doctor can serve as the first point-of-contact to guide you in  
	  managing your health holistically.  
- How will I know if I am eligible for Healthier SG?
	- Healthier SG targets Singapore citizens (SC) and permanent residents (PR) who are aged 40
	  years old and above. For a start, MOH will invite Singapore residents starting with those aged  
	  60 years and above regular chronic patients to enrol with a family clinic, followed by regular  
	  chronic patients in the 40-59 age group and thereafter the remaining 40 years and above in the  
	  next two years. The rollout phases will prioritise those who are more likely to fall sick or suffer  
	  from chronic illnesses. MOH will be sending SMS invites to those who are eligible. Do keep a  
	  lookout for updates on the latest eligibility criteria on the Healthier SG website.  
- Are there plans for those aged below 40 years old to be included in Healthier SG?
	- The Ministry will explore this in future after we enrol residents aged 40 and above.
	- The older age group tend to have more co-morbidities and are the most vulnerable to chronic
	  illnesses hence Healthier SG will target the older age group first and those with chronic  
	  illnesses to proactively prevent them from falling ill.  
	- In the meantime, all residents should continue to stay active and live healthily. There are a
	  variety of community programmes available, including : People’s Association (PA) activities,  
	  SportSG ActiveHealth programmes, and Health Promotion Board’s (HPB) National Steps  
	  Challenge and Eat, Drink, Shop Healthy Challenge!  
- What is the role of polyclinics and General Practitioners (GPs) in Healthier SG?
	- GPs and polyclinics form our primary care system. Under Healthier SG, residents can choose
	  which primary care provider they wish to enrol with, be it GP or polyclinic. Residents will be  
	  encouraged to enrol with the Healthier SG clinic they have been visiting for their existing care.  
- Will the care provided by different GPs and polyclinics under Healthier SG be the same?
	- You can be assured that the level of care will be consistently carried out regardless of which 8
	  doctor you choose to enrol with under Healthier SG. There will be standard care protocols to  
	  guide our GPs in managing prevalent chronic conditions such as diabetes, hypertension and  
	  lipid disorders. The protocols will also cover health screenings, medications, lifestyle  
	  adjustments, and referrals to specialist and acute care when necessary.`
const instructions = `## Instructions:
- You are Lisa, a friendly and helpful voice assistant of NHG Cares (National Healthcare Group) Hotline. You are based in Singapore.
- Respond briefly to the user's request, and do not provide unnecessary information. Answer in 1 to 3 sentences.
- If you don't understand the user's request, ask for clarification.
- Always maintain a positive and professional tone.
- If the user asks for personal information, do not provide it.
- If the user is in distress or asks for emergency services, advise them to call 995.
- In order to complete a GP appointment booking, the user needs to verify their identity via SingPass. Inform the user that they will receive a link via WhatsApp and they will complete the appointment on there.
- You are not capable of performing actions other than responding to the user.
- Dates should be in MM/DD/YYYY formats.
- You do not have access to up-to-date information, so you should not provide real-time data.
- Do not use markdown, emojis, or other formatting in your responses. Respond in a way easily spoken by text-to-speech software.
- Do not tell jokes, poems, or stories.
- Do not provide medical advice or diagnosis.
- 如果用户用中文提问，请用中文回答`;

const knowledge = `- What is Healthier SG?
	- Why does Healthier SG need to be launched soon(in second half of 2023)?
	- Healthier SG is a multi-year strategy to transform our healthcare system to focus more on preventive care, and empower individuals to take steps towards better health.
	- We have embarked on Healthier SG in view of the rising pressure from our ageing population and increasing chronic disease burden. Investing in preventive care will help to delay onset of illnesses and better manage existing illness to prevent deterioration, and this in turn extend the number of years we live in good health.  
	- Under Healthier SG, we will support you to:
	  • Take charge of your own health with a trusted Healthier SG clinic  
	  • Act on your Health Plan  
	  • Participate in a wide range of community programmes to stay healthy  
	  So, TAP into a healthier you, with Healthier SG today!  
- What can I expect from Healthier SG?
	- To start and be a part of Healthier SG, it only takes 3 simple steps:
		- 1. Enrol in Healthier SG via HealthHub Eligible residents will receive an SMS invitation from MOH to enrol in Healthier SG on HealthHub. You can then choose your preferred Healthier SG clinic* and make an appointment for your first consultation. You will also be asked to complete an onboarding questionnaire before you see your doctor. Note: Healthier SG clinic refers to both General Practitioner (GP) clinics and polyclinics  
		- 2. See your preferred Healthier SG clinic for your first consultation Upon enrolment,you will need to complete an onboarding questionnaire. The first consultation will be free, and the family doctor will assess your medical history, health needs and concerns from the onboarding questionnaire during the consultation.  
		- 3. Work together with your Healthier SG clinic on a personalised Health Plan The family doctor will co-develop a personalised Health Plan with you, and provide appropriate preventive measures or follow up management including but not limited to - lifestyle adjustments, as well as nationally recommended health screenings and vaccinations that will be fully subsidised by the Government. There will also be annual check-ins with your doctor (at least once a year or more frequently depending on your medical condition and progress).  
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
	  chronic patients in the 40 to 59 age group and thereafter the remaining 40 years and above in the  
	  next two years. The rollout phases will prioritise those who are more likely to fall sick or suffer  
	  from chronic illnesses. MOH will be sending SMS invites to those who are eligible. Do keep a  
	  lookout for updates on the latest eligibility criteria on the Healthier SG website.  
- Are there plans for those aged below 40 years old to be included in Healthier SG?
	- The Ministry will explore this in future after we enrol residents aged 40 and above.
	- The older age group tend to have more co-morbidities and are the most vulnerable to chronic
	  illnesses hence Healthier SG will target the older age group first and those with chronic  
	  illnesses to proactively prevent them from falling ill.  
	- In the meantime, all residents should continue to stay active and live healthily. There are a
	  variety of community programmes available, including : People's Association (PA) activities,  
	  SportSG ActiveHealth programmes, and Health Promotion Board's (HPB) National Steps  
	  Challenge and Eat, Drink, Shop Healthy Challenge!
- If I have not received the SMS invitation to join Healthier SG, what do I do?
	- MOH has invited Singapore Citizens and Permanent Residents aged 40 and above via SMS to enrol with a Healthier SG clinic or polyclinic. SMS invitations will continue to be sent to residents when they turn 40 years old. If you are 40 and above, you can self-enrol using the HealthHub app or enrol at any of the Enrolment Stations (see https://gowhere.gov.sg/healthiersg for locations) without the need of an SMS invitation.
	- Residents who need any clarification can call MOH Hotline 6325 9220.`;
export const prompt = `
${instructions}

${knowledge}`

import {FAQ} from "./questions";
export const RAG = (query: string) => {
	const searchResults = FAQ.search(query).slice(0, 2).map((q) => {
		console.log('\x1b[33m%s\x1b[0m', q.score); // Sets the color to yellow
		const item = `Topic:${q.item.topics[0]?.title}\nQ: ${q.item.title}\nA: ${q.item.answer.body}`
		console.log(item);
	}).join("\n\n") || "";

	

return `${instructions}

## Relevant FAQs
${knowledge}

${searchResults}

${example}`
}
import { VueDomain } from "./index.js";

const ISSUES = Object.freeze({
  "no-start": {severity:"professional",summary:"Engine will not start",recommendations:["Check the owner's manual and relevant starting interlocks.","Look for dim dashboard lights or repeated clicking; avoid repeated cranking.","If there is smoke, damaged wiring or a strong fuel smell, stop and seek professional assistance."]},
  "overheat": {severity:"emergency",summary:"Possible overheating",recommendations:["Pull over safely and switch the engine off.","Never open a hot or pressurized cooling system.","Arrange professional assistance if the warning persists, or there is steam or leaking coolant."]},
  "brakes": {severity:"emergency",summary:"Braking problem",recommendations:["Do not drive or ride with unreliable brakes.","Park safely and arrange qualified inspection or recovery."]},
  "tire": {severity:"emergency",summary:"Flat or damaged tire",recommendations:["Stop in a safe place; avoid further travel on the damaged tire.","Obtain qualified repair or replacement before continuing."]},
  "noise": {severity:"professional",summary:"Unusual engine noise",recommendations:["If severe or accompanied by smoke, loss of power or warning lights, stop safely.","Note when the noise occurs and arrange inspection for persistent or worsening noises."]},
  "other": {severity:"monitor",summary:"More information needed",recommendations:["Consult the owner's manual and dashboard warnings.","If the vehicle seems unsafe to control, stop and seek professional help."]}
});

const QUESTIONS={
 'no-start':['Does the starter turn, click, or remain silent?','What dashboard warnings appear, and when did the vehicle last run?','What are the make, model, year, powertrain and battery/service history?'],
 overheat:['Which warning or temperature indication appeared?','Was there steam or a visible leak, and has the engine been switched off safely?','What is the make/model/year and recent cooling-system service history?'],
 brakes:['Is braking weak, uneven, noisy or inconsistent?','Has travel stopped, and are brake warnings or visible leaks present?','What is the vehicle and brake-service history?'],
 tire:['Which tyre is affected and what visible damage or pressure warning is present?','Has the vehicle stopped safely?','What tyre size and manufacturer specification apply?'],
 noise:['When does the noise occur: starting, idle, acceleration or braking?','Are there warning lights, smoke or loss of power?','What changed recently, and what is the make/model/year and service history?'],
 other:['What are the make, model, year, powertrain and mileage?','What changed, when does it occur and what warnings appear?','What recent maintenance or repair was performed?']
};
function issueFor(symptoms,emergencyOnly=false){return symptoms.map(s=>[s,ISSUES[s]]).find(([,issue])=>issue&&(emergencyOnly?issue.severity==='emergency':true))||['other',ISSUES.other]}
export class MotoVueDomain extends VueDomain {
  constructor() { super({id:"motovue",name:"MOTOVUE",capabilities:{imageAnalysis:false,videoAnalysis:false}}); }
  emergencyCheck({ symptoms }) {
    const [key,issue]=issueFor(symptoms,true);
    if (!issue || issue.severity!=="emergency") return null;
    return { ...issue, followUpQuestions:QUESTIONS[key], limitations:["General guidance only. This is not a mechanical diagnosis."] };
  }
  async assess({ symptoms, category, media }) {
    const [key,issue]=issueFor(symptoms);
    const vehicle=category==="motorcycle" ? "motorcycle" : "car";
    return {
      ...issue,
      observations:[],
      followUpQuestions:QUESTIONS[key],
      limitations:[
        "General guidance only. This is not a mechanical diagnosis.",
        media.length ? "Attached photo/video is previewed locally and is NOT analyzed by AI." : "No media analysis was requested.",
        "Vehicle selected: "+vehicle+"."
      ]
    };
  }
}

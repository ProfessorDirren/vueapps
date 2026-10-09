import { VueDomain } from "./index.js";

const ISSUES = Object.freeze({
  "no-start": {severity:"professional",summary:"Engine will not start",recommendations:["Check the owner's manual and relevant starting interlocks.","Look for dim dashboard lights or repeated clicking; avoid repeated cranking.","If there is smoke, damaged wiring or a strong fuel smell, stop and seek professional assistance."]},
  "overheat": {severity:"emergency",summary:"Possible overheating",recommendations:["Pull over safely and switch the engine off.","Never open a hot or pressurized cooling system.","Arrange professional assistance if the warning persists, or there is steam or leaking coolant."]},
  "brakes": {severity:"emergency",summary:"Braking problem",recommendations:["Do not drive or ride with unreliable brakes.","Park safely and arrange qualified inspection or recovery."]},
  "tire": {severity:"emergency",summary:"Flat or damaged tire",recommendations:["Stop in a safe place; avoid further travel on the damaged tire.","Obtain qualified repair or replacement before continuing."]},
  "noise": {severity:"professional",summary:"Unusual engine noise",recommendations:["If severe or accompanied by smoke, loss of power or warning lights, stop safely.","Note when the noise occurs and arrange inspection for persistent or worsening noises."]},
  "other": {severity:"monitor",summary:"More information needed",recommendations:["Consult the owner's manual and dashboard warnings.","If the vehicle seems unsafe to control, stop and seek professional help."]}
});

export class MotoVueDomain extends VueDomain {
  constructor() { super({id:"motovue",name:"MOTOVUE",capabilities:{imageAnalysis:false,videoAnalysis:false}}); }
  emergencyCheck({ symptoms }) {
    const issue=ISSUES[symptoms[0]];
    if (!issue || issue.severity!=="emergency") return null;
    return { ...issue, limitations:["General guidance only. This is not a mechanical diagnosis."] };
  }
  async assess({ symptoms, category, media }) {
    const issue=ISSUES[symptoms[0]] || ISSUES.other;
    const vehicle=category==="motorcycle" ? "motorcycle" : "car";
    return {
      ...issue,
      observations:[],
      followUpQuestions:["When did the problem begin?","Are there any dashboard warning lights?"],
      limitations:[
        "General guidance only. This is not a mechanical diagnosis.",
        media.length ? "Attached photo/video is previewed locally and is NOT analyzed by AI." : "No media analysis was requested.",
        "Vehicle selected: "+vehicle+"."
      ]
    };
  }
}

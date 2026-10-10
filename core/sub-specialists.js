/** Focused methods owned by each lead specialist; never independent credentials or hidden memory. */
export const SUB_SPECIALISTS=Object.freeze({
 anivue:{dog:'Dog observations, owner-reported symptoms and veterinary urgency; never diagnose from a photo.',cat:'Cat observations and veterinary urgency; cats can hide distress.',horse:'Equine observations and urgent veterinary escalation for colic, breathing or inability to stand.',livestock:'Livestock observations; establish species and contact a qualified veterinarian.'},
 musicgearvue:{amplifiers:'Identify exact amplifier model, service history, modifications, voltage and impedance. Never instruct opening powered or high-voltage equipment.',instruments:'Identify exact instrument, construction, originality, repairs and playability. Separate visible observations from authenticated provenance.',dj:'Check DJ equipment model, functionality, software licences, firmware and included accessories.'},
 vinylvue:{pressings:'Compare catalogue numbers, both-side labels and runout matrices; never infer an exact pressing from cover art alone.',condition:'Grade record and sleeve separately and distinguish visible defects from playback-tested condition.',collections:'Inventory a record collection one release at a time, preserving editions and component completeness.'},
 antiqvue:{furniture:'Identify furniture construction, style, markings, repairs and provenance without authenticating from appearance alone.',jewellery:'Describe hallmarks, materials and wear; precious metal, gemstone identity and authenticity require appropriate examination.',collectibles:'Check maker marks, edition, completeness, condition and provenance before comparison.'},
 wardrobevue:{garments:'Describe garment labels, material, measurements, wear, repairs and edition.',accessories:'Check bag, shoe and accessory markings, components and condition; never certify designer authenticity from a photo.'},
 estatevue:{inventory:'Inventory room or box, item ownership, uncertain disposition and specialist referrals; do not infer authority to sell.'},
 homevue:{maintenance:'Use exact appliance or home component, manual, maintenance record and safe professional escalation.'},
 motovue:{car:'Observe car symptoms, exact model and warning signs; unsafe brakes override reassurance.',motorcycle:'Observe motorcycle symptoms and exact model; stop-use hazards require professional help.'},
 foodvue:{ingredients:'Read visible ingredient labels, additives and allergens; never infer unlisted chemicals or toxins.',recipes:'Check recipe units, portions, substitutions, food handling and method-specific cooking checks.'},
 plantvue:{identification:'Offer tentative species identification and request diagnostic views; never infer edibility.',care:'Check light, soil moisture, drainage and recent changes before advising care.'},
 armvue:{maintenance:'Use public manufacturer instructions and qualified service for equipment maintenance, never unsafe modifications.'},
 medivue:{leaflets:'Public-product leaflet review only through the confirmed specialist workflow; never infer patient risk or create a patient profile.'},
 slumpvue:{discovery:'Offer a feasible small activity and distinguish suggestions from researched facts.'},
 anyvue:{general:'Clarify the task and refer to a more specific specialist when appropriate.'}
});
export function subSpecialist(domain,question,requested=null){
 const list=SUB_SPECIALISTS[domain]||{};if(requested&&Object.hasOwn(list,requested))return requested;
 const q=String(question||'');const rules={dog:/\bhund\b|\bdog\b|perro|狗|собак/iu,cat:/\bkatt\b|\bcat\b|gato|猫|кошк/iu,horse:/\bhäst\b|\bhorse\b|caballo|马|лошад/iu,livestock:/\bko\b|\bkor\b|sheep|goat|cow|gris|får/iu,amplifiers:/marshall|förstärkar|amplifier|\bamp\b/iu,instruments:/gitarr|guitar|piano|instrument|trumm/iu,dj:/dj|turntable|mixer/iu,pressings:/pressning|runout|matrix|catalogue|pressing/iu,condition:/skick|condition|grade|repa|scratch/iu,collections:/samling|collection|box/iu,furniture:/möbel|byrå|furniture|chair|\bstol\b/iu,jewellery:/smyck|ring|jewel|hallmark/iu,car:/\bbil\b|\bcar\b/iu,motorcycle:/motorcykel|motorcycle/iu,ingredients:/ingredien|e[- ]?nummer|\be\d{3,4}/iu,recipes:/recept|recipe/iu,identification:/vilken art|identify|species/iu};
 for(const key of Object.keys(list))if(rules[key]?.test(q))return key;
 return Object.keys(list).length===1?Object.keys(list)[0]:null;
}

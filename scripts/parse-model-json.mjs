// Accept raw JSON or one complete JSON fence; never extract from surrounding prose.
export function parseModelJson(content) {
 if(typeof content!=='string') throw new Error('INVALID_JSON_RESPONSE');
 const text=content.trim();
 const fenced=/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i.exec(text);
 return JSON.parse(fenced?fenced[1]:text);
}

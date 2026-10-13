export async function GET(){return Response.json({finance:!!process.env.HITHINK_FINANCE_API_KEY,llm:!!(process.env.LLM_API_KEY&&process.env.LLM_BASE_URL&&process.env.LLM_MODEL)});}

import {credentials,getIndicators,modelJSON} from '../../../lib/server';
export async function POST(req:Request){const c=credentials(req);const checks=await Promise.allSettled([
 (async()=>{if(!c.finance)throw new Error('未填写扶摇 API Key');const data=await getIndicators('300033.SZ','2025-4',c.finance);return {message:'金融接口连接成功（300033.SZ / 2025年报）',requestId:data.requestId};})(),
 (async()=>{if(!c.llm||!c.base||!c.model)throw new Error('请填写模型地址、模型名称与 API Key');const j=await modelJSON(req,'连接测试。只输出JSON：{"ok":true}。','请确认连接');if(j?.ok!==true)throw new Error('模型连接已响应，但未返回预期JSON结构');return {message:'模型连接与JSON响应成功'};})()
]);const result=checks.map(v=>v.status==='fulfilled'?{ok:true,...v.value}:{ok:false,message:v.reason instanceof Error?v.reason.message:'连接失败'});return Response.json({finance:result[0],llm:result[1]});}

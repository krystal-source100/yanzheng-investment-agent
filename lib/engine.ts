export type Topic = 'growth' | 'cash' | 'collection';
export type Plan = { topics: Topic[]; question: string; clarification: string; boundary: string; engine: string };
export type Metric = { id: string; label: string; unit: string; current: number | null; previous: number | null; delta: number | null; rawCurrent: string | null; rawPrevious: string | null; sourceFieldCurrent: string | null; sourceFieldPrevious: string | null; fieldIssue: string | null };
export const DEFINITIONS: Record<string, [string,string]> = {
 operating_income_yoy_growth_ratio:['营业收入同比增长率','%'], net_profit_yoy_growth_ratio:['净利润同比增长率（原记录）','%'],parent_holder_net_profit_yoy_growth_ratio:['归母净利润同比增长率','%'],sale_gross_margin:['销售毛利率','%'],sale_net_interest_ratio:['销售净利率','%'],net_profit_cash_content:['净利润现金含量','源值'],operating_cash_net_yoy_growth_ratio:['现金流量净额增长率','%'],operating_cash_flow_net_divide_income:['销售现金比率','%'],receive_account_turnover_ratio:['应收账款周转率','次']
};
export const TOPICS: Record<Topic,{name:string;question:string;fields:string[]}> = {
 growth:{name:'增长与盈利',question:'增长是否伴随利润率改善？',fields:['operating_income_yoy_growth_ratio','parent_holder_net_profit_yoy_growth_ratio','sale_gross_margin','sale_net_interest_ratio']},
 cash:{name:'利润与现金',question:'现金与利润、收入的匹配指标是否改善？',fields:['parent_holder_net_profit_yoy_growth_ratio','net_profit_cash_content','operating_cash_flow_net_divide_income']},
 collection:{name:'回款效率',question:'应收账款周转效率是否改善？',fields:['receive_account_turnover_ratio','operating_income_yoy_growth_ratio','net_profit_cash_content']}
};
export function validPeriods(current:string,previous:string){
 if(!/^20\d{2}-[1-4]$/.test(current)||!/^20\d{2}-[1-4]$/.test(previous))throw new Error('报告期格式应为 YYYY-1 至 YYYY-4');
 if(current.slice(-1)!==previous.slice(-1)||Number(current.slice(0,4))!==Number(previous.slice(0,4))+1)throw new Error('首版仅支持相邻年份的同类报告期比较，例如2025年报与2024年报');
 const year=Number(current.slice(0,4)),quarter=Number(current.slice(-1)); const end=Date.UTC(year,quarter*3,0,23,59,59);if(end>Date.now())throw new Error('所选报告期尚未结束，请选择已结束的报告期');
}
export function numeric(v:unknown):number|null{if(v===null||v===undefined||typeof v==='boolean'||(typeof v==='string'&&!v.trim()))return null;const n=Number(v);return Number.isFinite(n)?n:null;}
export function flatten(data:any):Record<string,string|null>{if(!Array.isArray(data?.abilities))throw new Error('接口返回缺少 abilities，不能生成正常结果');const out:Record<string,string|null>={};for(const a of data.abilities)for(const i of a.indicators??[])if(typeof i.index_id==='string')out[i.index_id]=i.value==null?null:String(i.value);return out;}
export const FIELD_ALIASES:Record<string,string[]>={
 operating_income_yoy_growth_ratio:['operating_income_yoy_growth_ratio','calculate_operating_income_yoy_growth_ratio'],
 parent_holder_net_profit_yoy_growth_ratio:['parent_holder_net_profit_yoy_growth_ratio','calculate_parent_holder_net_profit_yoy_growth_ratio']
};
export function pickField(id:string,values:Record<string,string|null>){
 const names=FIELD_ALIASES[id]??[id];const present=names.filter(name=>Object.prototype.hasOwnProperty.call(values,name));const valid=present.filter(name=>numeric(values[name])!==null);
 if(valid.length>1&&new Set(valid.map(name=>numeric(values[name]))).size>1)return {field:null,raw:null,value:null,issue:'同义字段数值冲突，未自动择一'};
 const field=valid[0]??present[0]??null;const raw=field?values[field]:null;
 return {field,raw,value:numeric(raw),issue:field?numeric(raw)===null?'源字段为空或非有效数值':null:'响应未包含对应字段'};
}
export function metrics(topics:Topic[],a:Record<string,string|null>,b:Record<string,string|null>):Metric[]{return [...new Set(topics.flatMap(t=>TOPICS[t].fields))].map(id=>{const x=pickField(id,a),y=pickField(id,b),current=x.value,previous=y.value;return {id,label:DEFINITIONS[id][0],unit:DEFINITIONS[id][1],current,previous,delta:current===null||previous===null?null:Number((current-previous).toFixed(10)),rawCurrent:x.raw??null,rawPrevious:y.raw??null,sourceFieldCurrent:x.field,sourceFieldPrevious:y.field,fieldIssue:x.issue||y.issue};});}
export function evaluate(topics:Topic[],rows:Metric[]){const m=new Map(rows.map(r=>[r.id,r]));return topics.map(topic=>{const fields=TOPICS[topic].fields, missing=fields.filter(f=>m.get(f)?.current===null||m.get(f)?.previous===null);const support:{text:string;refs:string[]}[]=[],counter:{text:string;refs:string[]}[]=[];
 const delta=(id:string,label:string)=>{const r=m.get(id);if(r?.delta===null||r?.delta===undefined)return;const d=r.delta;if(d===0)return;const text=`${label}${d>0?'上升':'下降'} ${Math.abs(d).toFixed(2)}${r.unit==='%'?' 个百分点':r.unit==='次'?' 次':'（原始源值差）'}`;(d>0?support:counter).push({text,refs:[id]});};
 if(topic==='growth'){const rev=m.get('operating_income_yoy_growth_ratio'),profit=m.get('parent_holder_net_profit_yoy_growth_ratio');if(rev?.current!==null&&rev?.current!==undefined)(rev.current>0?support:counter).push({text:`本期营业收入同比${rev.current>=0?'增长':'下降'} ${Math.abs(rev.current).toFixed(2)}%`,refs:[rev.id]});if(profit?.current!==null&&profit?.current!==undefined)(profit.current>0?support:counter).push({text:`本期归母净利润同比${profit.current>=0?'增长':'下降'} ${Math.abs(profit.current).toFixed(2)}%（亏损或低基数需另查）`,refs:[profit.id]});delta('sale_gross_margin','销售毛利率');delta('sale_net_interest_ratio','销售净利率');}
 if(topic==='cash'){delta('net_profit_cash_content','净利润现金含量');delta('operating_cash_flow_net_divide_income','销售现金比率');}
 if(topic==='collection')delta('receive_account_turnover_ratio','应收账款周转率');
 const status=missing.length?'证据不完整':support.length&&counter.length?'正反证据并存':counter.length?'存在相反证据':support.length?'存在支持证据':'暂无明显变化';
 return {topic,title:TOPICS[topic].name,status,support,counter,missing,gap:topic==='cash'?'现金匹配比率不能单独代表盈利质量；尚未获取现金流原始金额及增速，仍需核对净利润符号、季节性与一次性因素。现金含量分母的利润口径未核验，不能直接与归母增长率对应。':topic==='collection'?'周转率变化不能直接证明客户拖欠或经营恶化，需补充信用政策与应收结构证据。':'增长率与利润率只能检查财务表现，不能证明未来增长持续或竞争优势增强。'};
 });}
export function demoPlan(question:string):Plan{const topics:Topic[]=[];if(/增长|营收|盈利|利润率|经营/.test(question))topics.push('growth');if(/现金|质量|利润/.test(question))topics.push('cash');if(/回款|应收|周转/.test(question))topics.push('collection');const unsupported=/明天|买入|卖出|涨停|股价|海外|竞争优势|护城河|估值/.test(question);return {topics:topics.length?topics:['growth','cash'],question,clarification:unsupported?'原判断包含首版无法直接验证的部分。以下仅检查相关财务表现，请确认是否继续。':'请确认：我们检查的是财务数据证据，而不是未来收益或经营原因。',boundary:'财务变化不能直接推出股价表现或因果结论。',engine:'演示规则拆解（未调用LLM）'};}
export const DEMO_CURRENT:Record<string,string|null>={operating_income_yoy_growth_ratio:'18',parent_holder_net_profit_yoy_growth_ratio:'24',sale_gross_margin:'34',sale_net_interest_ratio:'14',net_profit_cash_content:'62',operating_cash_flow_net_divide_income:'18',receive_account_turnover_ratio:'4.1'};
export const DEMO_PREVIOUS:Record<string,string|null>={operating_income_yoy_growth_ratio:'12',parent_holder_net_profit_yoy_growth_ratio:'16',sale_gross_margin:'32',sale_net_interest_ratio:'12',net_profit_cash_content:'105',operating_cash_flow_net_divide_income:'15',receive_account_turnover_ratio:'5.2'};

export function narrativeIssues(n:any,rows:Metric[]){
 const issues:string[]=[];if(typeof n?.observation!=='string'||typeof n?.nextQuestion!=='string'||!Array.isArray(n?.refs))return ['结构不合法'];
 const text=n.observation;const refs=new Set(n.refs);
 const groups:[RegExp,string[]][]=[[/利润率/,['sale_gross_margin','sale_net_interest_ratio']],[/毛利率/,['sale_gross_margin']],[/净利率/,['sale_net_interest_ratio']],[/利润增速|归母净利润|利润增长/,['parent_holder_net_profit_yoy_growth_ratio']],[/营收|营业收入/,['operating_income_yoy_growth_ratio']],[/现金含量/,['net_profit_cash_content']],[/销售现金比率/,['operating_cash_flow_net_divide_income']],[/回款效率|应收.*周转/,['receive_account_turnover_ratio']]];
 for(const [pattern,ids] of groups)if(pattern.test(text)&&!ids.some(id=>refs.has(id)&&rows.some(row=>row.id===id&&row.current!==null)))issues.push('描述涉及指标但缺少对应有效引用：'+ids.join('/'));
 if(/是否由|是否因为|是否.*导致/.test(n.nextQuestion))issues.push('下一步问题不应预设经营或口径原因');
 return issues;
}

import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'研证 · 投资判断验证助手',description:'从一个初步判断出发，用数据寻找支持证据、相反证据与证据缺口。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>;}

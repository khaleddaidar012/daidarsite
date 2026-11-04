import HubWorkspace from '@/components/ecosystem/HubWorkspace';
import {hubSections,type HubSection} from '../../../../../shared/hub-navigation';
export const dynamicParams=false;
export function generateStaticParams(){return hubSections.map(section=>({section}))}
export default async function HubSectionPage({params}:{params:Promise<{locale:string;section:string}>}){
 const {locale,section}=await params;
 return <HubWorkspace locale={locale==='en'?'en':'ar'} section={section as HubSection}/>;
}

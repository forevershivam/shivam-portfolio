export interface ProjectStat{value:string;label:string;}
export interface Project{id:number;slug:string;title:string;type:string;role:string;tech:string[];description:string;overview:string;architecture:string;implementation:string;stats:ProjectStat[];accent:string;myRole:string[];images:string[];hoverImage:string;github:string;liveUrl:string;}
const projects:Project[]=[
 {id:1,slug:'excel-sales-dashboard',title:'Sales Performance Analysis & Interactive Dashboard',type:'Excel • Business Reporting',role:'Personal Analytics Project',tech:['Microsoft Excel','PivotTables','Power Query','Data Visualization'],
 description:'Analyzed 52,351 sales records and developed an interactive Excel dashboard with 21 PivotTables, KPI cards, charts and dynamic slicers.',
 overview:'Sales dashboard evaluating profitability and business trends by region, product, customer segment and salesperson.',
 architecture:'Excel-based data analysis with PivotTables, linked metrics, charts and dynamic slicers.',
 implementation:'Developed 21 PivotTables and interactive reports to analyze regional, product, customer and sales performance.',
 stats:[{value:'52,351',label:'Sales records'},{value:'21',label:'PivotTables'}],accent:'#34D399',
 myRole:['Analyzed 52,351 sales records.','Built 21 PivotTables, charts, KPI cards and slicers.','Explored regional, product, customer-segment and salesperson performance.'],
 images:['/Projects/excel-sales.svg'],hoverImage:'/Projects/excel-sales.svg',github:'',liveUrl:'https://lnkd.in/p/eweBJNwx'},
 {id:2,slug:'indian-retail-profitability',title:'Indian Retail Sales & Profitability Analytics',type:'Excel • MySQL • Power BI (in progress)',role:'Personal Analytics Project',tech:['Excel','MySQL','SQL','Power BI','Data Modeling'],
 description:'Analyzed 138,000 retail orders, removed 1,090 duplicates and validated ₹155.17 Cr in Delivered-order revenue with a 16.95% estimated profit margin.',
 overview:'Analyzed retail orders dated January 2023–December 2025 for sales, profitability and month-over-month growth trends.',
 architecture:'Excel cleaning and validation, a MySQL star schema and AI-assisted analytical SQL queries. Power BI model remains in progress.',
 implementation:'Removed duplicates, reconciled the source and excluded Returned/Cancelled orders from revenue. Used CTEs, JOINs and window functions including LAG and DENSE_RANK.',
 stats:[{value:'138K',label:'Orders'},{value:'₹155.17 Cr',label:'Delivered-order revenue'},{value:'16.95%',label:'Estimated margin'}],accent:'#34D399',
 myRole:['Cleaned and validated retail orders.','Built a MySQL star schema and AI-assisted SQL queries.','Corrected revenue logic for Returned/Cancelled orders.','Developing a Power BI dashboard (in progress).'],
 images:['/Projects/retail.svg'],hoverImage:'/Projects/retail.svg',github:'https://github.com/forevershivam/Indian-Retail-Sales-Profitability-Analytics',liveUrl:''}
];
export function getAllProjects():Project[]{return projects;}
export function getProjectBySlug(slug:string):Project|undefined{return projects.find(p=>p.slug===slug);}
export function getAdjacentProjects(slug:string):{prev?:Project;next?:Project}{const idx=projects.findIndex(p=>p.slug===slug);if(idx===-1)return {};return {prev:projects[(idx-1+projects.length)%projects.length],next:projects[(idx+1)%projects.length]};}

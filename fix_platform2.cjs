const fs = require('fs');
let code = fs.readFileSync('src/pages/PlatformAnalyticsPage.tsx', 'utf-8');

// fix Grid item
code = code.replace(/<Grid item/g, '<Grid');

// fix useQuery typing
code = code.replace(/useQuery\(\{/g, 'useQuery<any>({');
code = code.replace(/useMutation\(\{/g, 'useMutation<any, any, any, any>({');

// fix TS2769: Type 'unknown' is not assignable to type 'ReactNode'. (line 69 `data?.layers?.map`)
code = code.replace(/data\?\.layers\?/g, '(data as any)?.layers?');
code = code.replace(/data\?\.run_id/g, '(data as any)?.run_id');
code = code.replace(/data\?\.timestamp/g, '(data as any)?.timestamp');

// fix other untyped data access
code = code.replace(/gMethodMutation\.data\?\./g, '(gMethodMutation.data as any)?.');
code = code.replace(/fairnessData\?\./g, '(fairnessData as any)?.');

fs.writeFileSync('src/pages/PlatformAnalyticsPage.tsx', code);

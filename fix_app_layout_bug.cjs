const fs = require('fs');
let code = fs.readFileSync('src/components/AppLayout.tsx', 'utf-8');

// src/components/AppLayout.tsx の 67行目付近にあるエラー修正
// `getNavGroupsForSingleRole` 関数の引数は `role` 単体だが、内部で `roles` が使われてしまっている。
code = code.replace(/roles\.includes\("student"\)/g, 'role === "student"');
code = code.replace(/!roles\.includes\("student"\)/g, 'role !== "student"');

// roles.includes を role === に直したけど、後続の関数 getNavGroups で rolesを使っているので、
// getNavGroupsForSingleRole の中身だけを元に戻す。
// 先ほどの置換で全体が変わってしまったかもしれないので、細かく指定して置換する。

// ChipやAvatarのところは roles でOK。
fs.writeFileSync('src/components/AppLayout.tsx', code);

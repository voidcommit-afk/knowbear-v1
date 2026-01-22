// vercel.ts  (no imports needed)

export default {
    version: 2,
    builds: [
        {
            src: 'frontend/package.json',
            use: '@vercel/static-build',
            config: { distDir: 'dist' },
        },
        {
            src: 'api/index.py',
            use: '@vercel/python',
        },
    ],
    routes: [
        { src: '/api/(.*)', dest: '/api/index.py' },
        { src: '/(.*)', dest: '/frontend/$1' },
        { handle: 'filesystem' },
        { src: '/(.*)', dest: '/frontend/index.html' },
    ],
    functions: {
        'api/index.py': {
            includeFiles: 'requirements.txt,backend/**',
            excludeFiles: '**/__pycache__/**,**/*.pyc,**/tests/**,**/*.test.py',
        },
    },
};
export interface Post {
  id: string;
  author: string;
  content: string;
  likes: number;
  timestamp: string;
}

export const posts: Post[] = [
  {
    id: '1',
    author: 'alice',
    content: 'Just shipped a new feature with rehynav! Tab navigation feels so smooth.',
    likes: 12,
    timestamp: '2m ago',
  },
  {
    id: '2',
    author: 'bob',
    content: 'Anyone else building hybrid apps? Capacitor + rehynav is a great combo.',
    likes: 8,
    timestamp: '15m ago',
  },
  {
    id: '3',
    author: 'charlie',
    content: 'Type-safe routing is a game changer. No more typos in route names.',
    likes: 24,
    timestamp: '1h ago',
  },
  {
    id: '4',
    author: 'diana',
    content: 'The modal and sheet overlays work perfectly for my e-commerce app.',
    likes: 5,
    timestamp: '3h ago',
  },
];

export function getPost(id: string): Post | undefined {
  return posts.find((p) => p.id === id);
}

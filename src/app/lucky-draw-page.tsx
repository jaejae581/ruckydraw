"use client";

import { useState, useEffect, FormEvent, useMemo, useRef, KeyboardEvent } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, addDoc, collection, onSnapshot, runTransaction, writeBatch, query, getDocs, deleteDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Ticket, Trophy, Trash2, List, ShieldCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import PhysicsContainer from '@/components/ui/physics-container';
import { getBallColorByNumber } from '@/lib/colors';
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";

export type Ball = {
  id: string; 
  number: string;
  name: string;
  prize: string;
  color: string;
  addedAt: string;
  drawnAt?: string;
};
type PermissionLevel = 'viewer' | 'registrar' | 'admin';
type Member = {
    number: string;
    name: string;
}

const getFormattedTimestamp = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
};

const ConfettiPiece = ({ id }: { id: number }) => {
  const style = useMemo(() => {
    const colors = ['#E91E63', '#673AB7', '#FFC107', '#4CAF50', '#2196F3'];
    return {'--color': colors[Math.floor(Math.random() * colors.length)], left: `${Math.random() * 100}%`, animationDuration: `${Math.random() * 2 + 3}s`, animationDelay: `${Math.random() * 0.5}s`, transform: `rotate(${Math.random() * 360}deg)`, opacity: 0 } as React.CSSProperties;
  }, []);
  return <div className="absolute top-[-10px] w-2.5 h-2.5 bg-[var(--color)] animate-confetti-fall" style={style} />;
};

const Confetti = () => {
  const [pieces, setPieces] = useState<number[]>([]);
  useEffect(() => { setPieces(Array.from({ length: 150 }, (_, i) => i)); }, []);
  if (pieces.length === 0) return null;
  return <div className="absolute inset-0 z-50 pointer-events-none">{pieces.map((id) => <ConfettiPiece key={id} id={id} />)}</div>;
};

const DetailsTable = ({ data, columns, currentPage, setCurrentPage, itemsPerPage = 5, onDelete, canDelete }: { 
    data: Ball[], 
    columns: { key: keyof Ball; header: string }[], 
    currentPage: number, 
    setCurrentPage: (page: number) => void, 
    itemsPerPage?: number,
    onDelete?: (id: string) => void,
    canDelete?: boolean
}) => {
    const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);
    return (<div className="w-full"><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-muted-foreground uppercase bg-secondary/50"><tr>{columns.map(col => <th key={col.key} className="px-4 py-3">{col.header}</th>)} {canDelete && <th className="px-4 py-3 text-right">삭제</th>}</tr></thead><tbody>{paginatedData.map((item) => (<tr key={item.id} className="border-b">{columns.map(col => <td key={col.key} className="px-4 py-3">{item[col.key] || '-'}</td>)} {canDelete && onDelete && <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button></td>}</tr>))}</tbody></table></div>{data.length === 0 && <p className="text-center py-8 text-muted-foreground">데이터가 없습니다.</p>}{totalPages > 1 && (<div className="flex justify-center items-center gap-2 mt-4">{Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (<Button key={page} size="sm" variant={currentPage === page ? 'default' : 'outline'} onClick={() => setCurrentPage(page)}>{page}</Button>))}</div>)}</div>);
};

export default function LuckyDrawPage() {
  const dbRef = useRef<any>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [drawnHistory, setDrawnHistory] = useState<Ball[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [drawnBall, setDrawnBall] = useState<Ball | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [entryNumber, setEntryNumber] = useState('');
  const [entryName, setEntryName] = useState('');
  const [entryPrize, setEntryPrize] = useState('');
  const [deleteCount, setDeleteCount] = useState('1');
  const [deletingBallIds, setDeletingBallIds] = useState<string[]>([]);
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('viewer');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  const [currentListPage, setCurrentListPage] = useState(1);
  const [historyListPage, setHistoryListPage] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [passwords, setPasswords] = useState({ registrar: '', admin: '' });
  
  const numberInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const prizeInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const { toast } = useToast();

  useEffect(() => {
    let firebaseConfigInput: string | object | undefined = typeof __firebase_config !== 'undefined' ? __firebase_config : process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
    if (!firebaseConfigInput) { console.error("Firebase 설정이 없습니다."); return; }
    let firebaseConfig;
    try {
        if (typeof firebaseConfigInput === 'string') {
            if ((firebaseConfigInput.startsWith("'") && firebaseConfigInput.endsWith("'")) || (firebaseConfigInput.startsWith('"') && firebaseConfigInput.endsWith('"'))) {
                firebaseConfigInput = firebaseConfigInput.substring(1, firebaseConfigInput.length - 1);
            }
            firebaseConfig = JSON.parse(firebaseConfigInput);
        } else { firebaseConfig = firebaseConfigInput; }
    } catch (error) { console.error("Firebase 설정을 파싱하는 데 실패했습니다:", error); return; }
    if (!firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.projectId) { console.error("Firebase 설정이 유효하지 않습니다. apiKey와 projectId를 확인하세요."); return; }
    const appId = typeof __app_id !== 'undefined' ? __app_id : process.env.NEXT_PUBLIC_APP_ID || 'default-app-id';
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    dbRef.current = db;

    const setupListeners = () => {
        const ballsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'balls');
        const historyCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'drawnHistory');
        const membersCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'members');
        const passwordDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'permissions');

        onSnapshot(query(ballsCollectionRef), (snapshot) => { setBalls(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ball))); });
        onSnapshot(query(historyCollectionRef), (snapshot) => {
            const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ball));
            historyData.sort((a, b) => (b.drawnAt || '').localeCompare(a.drawnAt || ''));
            setDrawnHistory(historyData);
        });
        onSnapshot(query(membersCollectionRef), (snapshot) => { setMembers(snapshot.docs.map(doc => doc.data() as Member)); });
        onSnapshot(passwordDocRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setPasswords({ registrar: data.registrarPassword || '', admin: data.adminPassword || '' });
            } else { console.warn("비밀번호 설정 문서를 찾을 수 없습니다."); }
        });
    };
    onAuthStateChanged(auth, async (user) => {
        if (user) { setupListeners(); } else {
            const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : process.env.NEXT_PUBLIC_INITIAL_AUTH_TOKEN;
            if (initialAuthToken) { await signInWithCustomToken(auth, initialAuthToken); } else { await signInAnonymously(auth); }
        }
    });
  }, []);

  useEffect(() => { if (isAddModalOpen) { setTimeout(() => { numberInputRef.current?.focus(); }, 100); } }, [isAddModalOpen]);

  const handleAddEntry = async (e: FormEvent) => {
    e.preventDefault();
    if (isAdding || !dbRef.current || !entryNumber.trim() || !entryName.trim() || !entryPrize.trim()) return;
    setIsAdding(true);
    const numberValue = parseInt(entryNumber.trim(), 10);
    if (isNaN(numberValue)) { setIsAdding(false); return; }
    const appId = typeof __app_id !== 'undefined' ? __app_id : process.env.NEXT_PUBLIC_APP_ID || 'default-app-id';
    const ballsCollectionRef = collection(dbRef.current, 'artifacts', appId, 'public', 'data', 'balls');
    const newBallData = {
        number: entryNumber.trim(), name: entryName.trim(), prize: entryPrize.trim(),
        color: getBallColorByNumber(String(numberValue)), addedAt: getFormattedTimestamp(),
    };
    try {
        await addDoc(ballsCollectionRef, newBallData);
        setEntryNumber(''); setEntryName(''); setEntryPrize(''); setIsAddModalOpen(false);
    } catch (error) { console.error("추첨권 추가 오류:", error);
    } finally { setIsAdding(false); }
  };

  const handleDraw = () => {
    if (!dbRef.current || balls.length === 0 || isDrawing) return;
    setIsDrawing(true); setShowConfetti(false);
    
    setTimeout(async () => {
        const appId = typeof __app_id !== 'undefined' ? __app_id : process.env.NEXT_PUBLIC_APP_ID || 'default-app-id';
        if (balls.length === 0) { setIsDrawing(false); return; }
        const randomIndex = Math.floor(Math.random() * balls.length);
        const selectedBall = balls[randomIndex];
        try {
            await runTransaction(dbRef.current, async (transaction) => {
                const ballDocRef = doc(dbRef.current, 'artifacts', appId, 'public', 'data', 'balls', selectedBall.id);
                const historyCollectionRef = collection(dbRef.current, 'artifacts', appId, 'public', 'data', 'drawnHistory');
                const ballDoc = await transaction.get(ballDocRef);
                if (!ballDoc.exists()) { throw "선택된 공이 이미 다른 사용자에 의해 추첨되었습니다. 잠시 후 다시 시도하세요."; }
                const winnerData = { ...selectedBall, drawnAt: getFormattedTimestamp() };
                delete (winnerData as any).id;
                transaction.delete(ballDocRef);
                const newHistoryRef = doc(historyCollectionRef);
                transaction.set(newHistoryRef, winnerData);
                setDrawnBall({ ...winnerData, id: newHistoryRef.id });
            });
            setShowConfetti(true); setIsResultModalOpen(true);
            setTimeout(() => setShowConfetti(false), 6000);
        } catch (error) { console.error("추첨 진행 오류:", error); alert(String(error));
        } finally { setIsDrawing(false); }
    }, 4000);
  };
  
  const handleRandomDelete = () => {
    const count = parseInt(deleteCount, 10);
    if (!dbRef.current || isNaN(count) || count <= 0 || count > balls.length) return;
    const appId = typeof __app_id !== 'undefined' ? __app_id : process.env.NEXT_PUBLIC_APP_ID || 'default-app-id';
    const shuffled = [...balls].sort(() => 0.5 - Math.random());
    const ballsToDelete = shuffled.slice(0, count);
    setDeletingBallIds(ballsToDelete.map(b => b.id));
    
    setTimeout(async () => {
        try {
            const batch = writeBatch(dbRef.current);
            ballsToDelete.forEach(ball => {
                const ballDocRef = doc(dbRef.current, 'artifacts', appId, 'public', 'data', 'balls', ball.id);
                batch.delete(ballDocRef);
            });
            await batch.commit();
        } catch (error) { 
            console.error("랜덤 삭제 오류:", error); 
        } finally {
            setDeletingBallIds([]);
        }
    }, 1000);
  };

  const handleDeleteAllHistory = async () => {
    if (!dbRef.current || permissionLevel !== 'admin') return;
    if (!window.confirm("정말로 모든 당첨 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;

    const appId = typeof __app_id !== 'undefined' ? __app_id : process.env.NEXT_PUBLIC_APP_ID || 'default-app-id';
    const historyCollectionRef = collection(dbRef.current, 'artifacts', appId, 'public', 'data', 'drawnHistory');
    
    try {
        const snapshot = await getDocs(query(historyCollectionRef));
        const batch = writeBatch(dbRef.current);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        toast({ title: "성공", description: "모든 당첨 내역이 삭제되었습니다." });
    } catch (error) {
        console.error("당첨 내역 삭제 오류:", error);
        toast({ variant: "destructive", title: "오류", description: "당첨 내역 삭제에 실패했습니다." });
    }
  };

  const handleDeleteSingleBall = async (ballId: string) => {
    if (!dbRef.current || permissionLevel !== 'admin') return;
    if (!window.confirm("정말로 이 추첨권을 삭제하시겠습니까?")) return;

    const appId = typeof __app_id !== 'undefined' ? __app_id : process.env.NEXT_PUBLIC_APP_ID || 'default-app-id';
    const ballDocRef = doc(dbRef.current, 'artifacts', appId, 'public', 'data', 'balls', ballId);
    
    try {
        await deleteDoc(ballDocRef);
        toast({ title: "성공", description: "선택한 추첨권이 삭제되었습니다." });
    } catch (error) {
        console.error("추첨권 삭제 오류:", error);
        toast({ variant: "destructive", title: "오류", description: "추첨권 삭제에 실패했습니다." });
    }
  };

  const handleAuthSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (passwords.admin && passwordInput === passwords.admin) {
        setPermissionLevel('admin');
        toast({ title: "성공", description: "모든 권한이 생겼습니다." });
        setIsAuthModalOpen(false); setPasswordInput(''); setAuthError('');
    } else if (passwords.registrar && passwordInput === passwords.registrar) {
        setPermissionLevel('registrar');
        toast({ title: "성공", description: "추첨권 추가 권한이 생겼습니다." });
        setIsAuthModalOpen(false); setPasswordInput(''); setAuthError('');
    } else {
        setAuthError('비밀번호가 올바르지 않습니다.');
    }
  };

  useEffect(() => { if (!isResultModalOpen) { setShowConfetti(false); } }, [isResultModalOpen]);

  const latestWinner = drawnHistory[0];

  return (
    <div className="min-h-screen w-full bg-background font-body text-foreground">
      <Toaster />
      <style jsx global>{`input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button {-webkit-appearance: none; margin: 0;} input[type="number"] {-moz-appearance: textfield;}`}</style>
      <main className="container mx-auto max-w-5xl px-4 py-8">
        <header className="text-center mb-6"><h1 className="text-3xl md:text-4xl font-extrabold text-primary font-headline">솔백사 추첨함</h1></header>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-2 flex flex-col gap-8">
            <Card className="shadow-xl border-2 border-transparent hover:border-primary/20 transition-all">
              <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-primary"><Ticket />추첨 설정</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => { setIsAuthModalOpen(true); setAuthError(''); setPasswordInput(''); }}><ShieldCheck className="mr-2 h-4 w-4" />권한</Button>
                </div>
                <div className="text-sm text-muted-foreground pt-2">현재 추첨권: <span className="font-bold text-primary">{balls.length}</span>개</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}><DialogTrigger asChild><Button size="lg" className="w-full" disabled={permissionLevel === 'viewer' || isDrawing || deletingBallIds.length > 0}><Plus className="mr-2 h-4 w-4" />추첨권 추가하기</Button></DialogTrigger>
                  <DialogContent><DialogHeader><DialogTitle>새 추첨권 추가</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddEntry} className="space-y-4">
                      <div>
                        <Label htmlFor="entry-name">이름</Label>
                        <Input ref={nameInputRef} id="entry-name" value={entryName} placeholder="번호를 입력하면 자동 완성됩니다" disabled className="focus-visible:ring-0 focus-visible:ring-offset-0"/>
                      </div>
                      <div>
                        <Label htmlFor="entry-number">번호</Label>
                        <Input ref={numberInputRef} id="entry-number" value={entryNumber} onChange={(e) => {
                                const newNumber = e.target.value;
                                setEntryNumber(newNumber);
                                const member = members.find(m => m.number === newNumber.trim());
                                if (member) { setEntryName(member.name); } else { setEntryName(''); }
                            }}
                            placeholder="추첨 번호" onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); prizeInputRef.current?.focus(); }}} 
                        />
                      </div>
                      <div>
                        <Label htmlFor="entry-prize">상품명</Label>
                        <Input ref={prizeInputRef} id="entry-prize" value={entryPrize} onChange={(e) => setEntryPrize(e.target.value)} placeholder="상품" onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); submitButtonRef.current?.click(); }}} />
                      </div>
                      <Button ref={submitButtonRef} type="submit" className="w-full" disabled={isAdding}>
                        {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isAdding ? '추가 중...' : '추가'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
                <div className="flex items-center gap-2 pt-2">
                  <Input type="number" className="w-20 text-center" value={deleteCount} onChange={(e) => setDeleteCount(e.target.value)} min="1" max={balls.length} disabled={permissionLevel !== 'admin' || deletingBallIds.length > 0}/>
                  <Button onClick={handleRandomDelete} variant="outline" className="flex-grow" disabled={permissionLevel !== 'admin' || isDrawing || balls.length === 0 || deletingBallIds.length > 0}><Trash2 className="mr-2 h-4 w-4" />랜덤 삭제하기</Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <Button onClick={handleDraw} size="lg" className="w-full bg-accent hover:bg-accent/90" disabled={permissionLevel !== 'admin' || isDrawing || balls.length === 0 || deletingBallIds.length > 0}>{isDrawing ? "추첨 중..." : "추첨하기"}</Button>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-xl">
              <CardHeader><CardTitle className="flex items-center justify-between"><div className="flex items-center gap-2"><Trophy />최근 당첨자</div></CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-4">
                {latestWinner ? (<div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: `${latestWinner.color}20` }}><div className="flex flex-col text-left"><span className="font-bold" style={{ color: latestWinner.color }}>{latestWinner.number}. {latestWinner.name}</span><span className="text-sm text-muted-foreground">{latestWinner.prize}</span></div><span className="text-xs text-muted-foreground whitespace-nowrap pl-2">{latestWinner.drawnAt}</span></div>) : (<div className="text-center text-muted-foreground py-4"><p className="font-semibold">아직 당첨자가 없습니다.</p></div>)}
                <Button variant="secondary" className="w-full" onClick={() => setIsListModalOpen(true)}><List className="mr-2 h-4 w-4" /> 목록 보기</Button>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-3">
            <Card className="shadow-xl overflow-hidden">
                <CardContent className="relative bg-secondary/30 h-[520px] border-2 border-dashed flex items-center justify-center p-0">
                  <PhysicsContainer balls={balls} isShaking={isDrawing} deletingBallIds={deletingBallIds}/>
                  {!isDrawing && balls.length === 0 && (<div className="text-center text-muted-foreground z-10"><Ticket size={48} className="mx-auto mb-4" /><p className="font-semibold">추첨기가 비어 있습니다!</p><p>추첨을 시작하려면 참가자를 추가하세요.</p></div>)}
                </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
        <DialogContent className="max-w-sm"><div className="relative w-full h-full flex flex-col items-center justify-center text-center pt-8">{showConfetti && <Confetti />}<DialogHeader><DialogTitle className="text-2xl font-bold">🎉 당첨을 축하합니다! 🎉</DialogTitle><DialogDescription className="pt-2">그리고 우승자는...</DialogDescription></DialogHeader>{drawnBall && (<div className="my-8 transform-gpu animate-drawn-ball-tumble"><div className="relative flex items-center justify-center w-48 h-48 rounded-full text-white font-bold text-2xl shadow-2xl p-4 flex-col" style={{ backgroundColor: drawnBall.color }}><div className="absolute top-1/3 left-1/3 w-6 h-6 bg-white/40 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div><span className="text-5xl font-extrabold">{drawnBall.number}</span><span className="mt-2 text-xl font-semibold truncate">{drawnBall.name}</span><span className="mt-1 text-base opacity-80 truncate">{drawnBall.prize}</span></div></div>)}<DialogFooter className="w-full"><Button onClick={() => setIsResultModalOpen(false)} className="w-full">닫기</Button></DialogFooter></div></DialogContent>
      </Dialog>
      <Dialog open={isListModalOpen} onOpenChange={setIsListModalOpen}>
        <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>목록 보기</DialogTitle></DialogHeader>
            <div className="border-b"><nav className="-mb-px flex space-x-6"><button onClick={() => setActiveTab('current')} className={cn('whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm', activeTab === 'current' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>현재 추첨권</button><button onClick={() => setActiveTab('history')} className={cn('whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm', activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>당첨 내역</button></nav></div>
            <div className="py-4">
                {activeTab === 'current' ? (
                    <DetailsTable data={balls} columns={[{key: 'addedAt', header: '생성시각'}, {key: 'number', header: '번호'}, {key: 'name', header: '이름'}, {key: 'prize', header: '상품명'}]} currentPage={currentListPage} setCurrentPage={setCurrentListPage} onDelete={handleDeleteSingleBall} canDelete={permissionLevel === 'admin'} />
                ) : (
                    <DetailsTable data={drawnHistory} columns={[{key: 'drawnAt', header: '당첨시각'}, {key: 'number', header: '번호'}, {key: 'name', header: '이름'}, {key: 'prize', header: '상품명'}]} currentPage={historyListPage} setCurrentPage={setHistoryListPage} />
                )}
            </div>
            {activeTab === 'history' && permissionLevel === 'admin' && (
                <DialogFooter>
                    <Button variant="destructive" onClick={handleDeleteAllHistory}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        당첨 내역 모두 삭제
                    </Button>
                </DialogFooter>
            )}
        </DialogContent>
      </Dialog>
      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>관리 비밀번호 입력</DialogTitle><DialogDescription>권한을 얻으려면 비밀번호를 입력하세요.</DialogDescription></DialogHeader>
            <form onSubmit={handleAuthSubmit} className="space-y-4 pt-4">
                <Input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="비밀번호"/>
                {authError && <p className="text-sm text-destructive">{authError}</p>}
                <Button type="submit" className="w-full">확인</Button>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


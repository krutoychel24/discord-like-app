import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Copy, UserPlus, MicOff, VolumeX, UserRound } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface Props {
    user: { id: string; name: string; avatar: string } | null;
    isSelf: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    onMute?: (userId: string) => void;
}

export const UserContextMenu: React.FC<Props> = ({ user, isSelf, position, onClose, onMute }) => {
    const { addFriend, friends } = useAppStore();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        const closeKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('mousedown', close);
        window.addEventListener('keydown', closeKey);
        return () => { window.removeEventListener('mousedown', close); window.removeEventListener('keydown', closeKey); };
    }, [onClose]);

    if (!user) return null;

    const isFriend = friends.some(f => f.name.toLowerCase() === user.name.toLowerCase());

    // Adjust position to stay in viewport
    const adjustedX = Math.min(position.x, window.innerWidth - 210);
    const adjustedY = Math.min(position.y, window.innerHeight - 300);

    const MenuItem = ({ icon: Icon, label, onClick, danger = false, disabled = false, sublabel }: {
        icon: React.FC<{ size?: number; className?: string }>;
        label: string;
        sublabel?: string;
        onClick?: () => void;
        danger?: boolean;
        disabled?: boolean;
    }) => (
        <button
            onClick={disabled ? undefined : () => { onClick?.(); onClose(); }}
            disabled={disabled}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-colors ${disabled ? 'opacity-30 cursor-default' : danger ? 'text-red-400 hover:bg-red-500/15' : 'text-zinc-300 hover:bg-white/[0.07] hover:text-white'
                }`}
        >
            <Icon size={14} className={danger ? 'text-red-400' : 'text-zinc-500'} />
            <div>
                <div>{label}</div>
                {sublabel && <div className="text-[10px] text-zinc-600 mt-0.5">{sublabel}</div>}
            </div>
        </button>
    );

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            style={{ left: adjustedX, top: adjustedY }}
            className="fixed z-[100] w-52 bg-[#111111] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        >
            {/* User header */}
            <div className="px-3 pt-3 pb-2 flex items-center gap-2.5 border-b border-white/[0.06] mb-1">
                <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-xl" />
                <div>
                    <p className="text-sm font-bold text-white">{user.name}</p>
                    <p className="text-[10px] text-zinc-500">{isSelf ? 'Вы' : 'В канале'}</p>
                </div>
            </div>

            <div className="px-1.5 pb-1.5 space-y-0.5">
                <MenuItem icon={UserRound} label="Просмотр профиля" onClick={() => { }} />

                {!isSelf && (
                    <>
                        <div className="h-px bg-white/[0.05] my-1" />
                        <MenuItem
                            icon={UserPlus}
                            label={isFriend ? 'Уже в друзьях' : 'Добавить в друзья'}
                            disabled={isFriend}
                            onClick={() => addFriend(user.name)}
                        />
                        <MenuItem icon={MicOff} label="Заглушить" onClick={() => onMute?.(user.id)} />
                        <MenuItem icon={VolumeX} label="Откл. звук" onClick={() => { }} />
                        <div className="h-px bg-white/[0.05] my-1" />
                        <MenuItem
                            icon={Copy}
                            label="Копировать ID"
                            onClick={() => navigator.clipboard.writeText(user.id)}
                        />
                    </>
                )}

                {isSelf && (
                    <>
                        <div className="h-px bg-white/[0.05] my-1" />
                        <MenuItem
                            icon={Copy}
                            label="Копировать ID"
                            onClick={() => navigator.clipboard.writeText(user.id)}
                        />
                    </>
                )}
            </div>
        </motion.div>
    );
};

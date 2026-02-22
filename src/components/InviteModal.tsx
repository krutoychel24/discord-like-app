import React from 'react';
import { motion } from 'framer-motion';
import { X, Copy, CheckCircle2 } from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';

interface InviteModalProps {
    serverId: string;
    onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ serverId, onClose }) => {
    const [copied, setCopied] = React.useState(false);
    const link = `https://alo-duraki.app/invite/${serverId}`;

    const handleCopy = async () => {
        try {
            await writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-6">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <h2 className="text-xl font-bold text-white mb-2">Пригласить друзей</h2>
                    <p className="text-sm text-zinc-400 mb-6">
                        Отправь эту ссылку другу, чтобы он мог присоединиться к серверу.
                    </p>

                    <div className="bg-black/40 border border-white/10 rounded-xl p-1 flex items-center gap-2">
                        <input
                            type="text"
                            readOnly
                            value={link}
                            className="flex-1 bg-transparent px-3 py-2 text-sm text-zinc-300 outline-none"
                        />
                        <button
                            onClick={handleCopy}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-indigo-500 hover:bg-indigo-400 text-white'}`}
                        >
                            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                            {copied ? 'Скопировано!' : 'Копировать'}
                        </button>
                    </div>
                </div>
                <div className="bg-black/20 p-4 border-t border-white/5 text-xs text-zinc-500 text-center">
                    Ссылка действительна бессрочно.
                </div>
            </motion.div>
        </div>
    );
};

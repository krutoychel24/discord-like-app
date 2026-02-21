import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Mic, Headphones, ShieldCheck, Settings as SettingsIcon, Volume2, Radio, Sliders } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface SettingsProps {
    onClose: () => void;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative w-10 h-5 rounded-full border transition-all duration-200 flex items-center flex-shrink-0 ${checked
                    ? 'bg-indigo-500 border-indigo-500'
                    : 'bg-zinc-800 border-zinc-700'
                }`}
        >
            <span className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow transition-all duration-200 ${checked ? 'left-[22px]' : 'left-[3px]'}`} />
        </button>
    );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200">{label}</p>
                {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
            </div>
            {children}
        </div>
    );
}

const TABS = [
    { id: 'audio', label: 'Звук', icon: Mic },
    { id: 'account', label: 'Аккаунт', icon: Radio },
    { id: 'security', label: 'Безопасность', icon: ShieldCheck },
];

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
    const { audioSettings, setAudioSettings, currentUser } = useAppStore();
    const [activeTab, setActiveTab] = useState('audio');
    const [inputs, setInputs] = useState<MediaDeviceInfo[]>([]);
    const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]);

    useEffect(() => {
        const getDevices = async () => {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                const devices = await navigator.mediaDevices.enumerateDevices();
                setInputs(devices.filter(d => d.kind === 'audioinput'));
                setOutputs(devices.filter(d => d.kind === 'audiooutput'));
            } catch { }
        };
        getDevices();
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                className="w-full max-w-2xl bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
                style={{ maxHeight: '80vh' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] bg-black/30 shrink-0">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <SettingsIcon size={16} className="text-zinc-400" />
                        Настройки
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar tabs */}
                    <nav className="w-44 border-r border-white/[0.07] bg-black/20 p-3 shrink-0 flex flex-col gap-1">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${activeTab === tab.id
                                            ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                                        }`}
                                >
                                    <Icon size={14} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {/* ── ЗВУК ── */}
                        {activeTab === 'audio' && (
                            <>
                                {/* Устройства */}
                                <section>
                                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Headphones size={11} /> Устройства
                                    </p>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Микрофон (вход)</label>
                                            <select
                                                value={audioSettings.inputDeviceId || ''}
                                                onChange={e => setAudioSettings({ inputDeviceId: e.target.value || null })}
                                                className="strict-input w-full py-2.5 text-sm"
                                            >
                                                <option value="">Системный по умолчанию</option>
                                                {inputs.map(d => (
                                                    <option key={d.deviceId} value={d.deviceId}>
                                                        {d.label || `Микрофон (${d.deviceId.slice(0, 8)})`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Динамики / наушники (выход)</label>
                                            <select
                                                value={audioSettings.outputDeviceId || ''}
                                                onChange={e => setAudioSettings({ outputDeviceId: e.target.value || null })}
                                                className="strict-input w-full py-2.5 text-sm"
                                            >
                                                <option value="">Системный по умолчанию</option>
                                                {outputs.map(d => (
                                                    <option key={d.deviceId} value={d.deviceId}>
                                                        {d.label || `Динамики (${d.deviceId.slice(0, 8)})`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </section>

                                <div className="h-px bg-white/[0.06]" />

                                {/* Обработка голоса */}
                                <section>
                                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Sliders size={11} /> Обработка голоса
                                    </p>
                                    <p className="text-xs text-zinc-600 mb-4">Применяется при следующем входе в канал</p>

                                    <div className="divide-y divide-white/[0.06]">
                                        <SettingRow label="Шумодав" description="Фильтрует фоновые шумы (клавиатура, вентилятор, улица)">
                                            <Toggle
                                                checked={audioSettings.noiseSuppression}
                                                onChange={v => setAudioSettings({ noiseSuppression: v })}
                                            />
                                        </SettingRow>
                                        <SettingRow label="Эхоподавление" description="Убирает эхо от динамиков попадающее обратно в микрофон">
                                            <Toggle
                                                checked={audioSettings.echoCancellation}
                                                onChange={v => setAudioSettings({ echoCancellation: v })}
                                            />
                                        </SettingRow>
                                        <SettingRow label="Автоусиление" description="Автоматически регулирует громкость микрофона">
                                            <Toggle
                                                checked={audioSettings.autoGainControl}
                                                onChange={v => setAudioSettings({ autoGainControl: v })}
                                            />
                                        </SettingRow>
                                    </div>
                                </section>

                                <div className="h-px bg-white/[0.06]" />

                                {/* Громкость микрофона */}
                                <section>
                                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Volume2 size={11} /> Уровни
                                    </p>

                                    <div className="space-y-5">
                                        <div>
                                            <div className="flex justify-between text-xs mb-2">
                                                <span className="text-zinc-400 font-medium">Громкость микрофона</span>
                                                <span className="text-indigo-400 font-bold">{audioSettings.micVolume}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={0}
                                                max={200}
                                                value={audioSettings.micVolume}
                                                onChange={e => setAudioSettings({ micVolume: +e.target.value })}
                                                className="w-full h-1 rounded-full accent-indigo-500 cursor-pointer"
                                            />
                                            <div className="flex justify-between text-[10px] text-zinc-700 mt-1">
                                                <span>Тихо</span><span>Норма</span><span>Громко</span>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-xs mb-2">
                                                <span className="text-zinc-400 font-medium">Порог активации голоса</span>
                                                <span className="text-indigo-400 font-bold">{audioSettings.voiceThreshold}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={1}
                                                max={60}
                                                value={audioSettings.voiceThreshold}
                                                onChange={e => setAudioSettings({ voiceThreshold: +e.target.value })}
                                                className="w-full h-1 rounded-full accent-indigo-500 cursor-pointer"
                                            />
                                            <div className="flex justify-between text-[10px] text-zinc-700 mt-1">
                                                <span>Всегда</span><span>Нормально</span><span>Только громко</span>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </>
                        )}

                        {/* ── АККАУНТ ── */}
                        {activeTab === 'account' && (
                            <section>
                                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Профиль</p>
                                <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                                    <img src={currentUser?.avatar} alt="Avatar" className="w-14 h-14 rounded-xl border border-white/10" />
                                    <div>
                                        <p className="text-base font-bold text-white">{currentUser?.name || '—'}</p>
                                        <p className="text-xs text-zinc-500 font-mono mt-0.5 break-all">{currentUser?.id || '—'}</p>
                                        <p className="text-xs text-indigo-400 font-bold mt-1.5">💎 {currentUser?.balance ?? 0} кредитов</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* ── БЕЗОПАСНОСТЬ ── */}
                        {activeTab === 'security' && (
                            <section>
                                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Шифрование</p>
                                <div className="p-5 bg-green-500/5 border border-green-500/20 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShieldCheck size={16} className="text-green-400" />
                                        <p className="font-bold text-green-400 text-sm">E2EE активно — DTLS/SRTP</p>
                                    </div>
                                    <p className="text-xs text-green-600 leading-relaxed">
                                        Все голосовые потоки зашифрованы по стандарту WebRTC. Промежуточный сервер видит только метаданные сигнализации, но не содержимое звонка.
                                    </p>
                                </div>
                                <div className="mt-4 divide-y divide-white/[0.06]">
                                    <SettingRow label="Предупреждать о незащищённых соединениях" description="Показывать уведомление если соединение деградировало">
                                        <Toggle checked={true} onChange={() => { }} />
                                    </SettingRow>
                                </div>
                            </section>
                        )}

                    </div>
                </div>
            </motion.div>
        </div>
    );
};

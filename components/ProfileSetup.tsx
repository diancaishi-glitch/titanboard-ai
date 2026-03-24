
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { ShieldCheck, Target, Wallet } from 'lucide-react';

interface ProfileSetupProps {
  onComplete: (profile: UserProfile) => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  // Added estimatedCash and maxBuyingPower to satisfy UserProfile interface requirements
  const [formData, setFormData] = useState<UserProfile>({
    name: '',
    experienceLevel: '中级 (Intermediate)',
    currentCapital: '$100,000',
    estimatedCash: 100000,
    maxBuyingPower: 150000,
    riskTolerance: '激进 (Aggressive)',
    learningFocus: [],
    primaryGoal: '寻找百倍回报 (100x) & 精通合约/做空'
  });

  const handleChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep(s => s + 1);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent mb-2">
            启动泰坦协议
          </h1>
          <p className="text-slate-400 text-sm">
            为了更有效地指导你，董事会需要了解你的基础情况。
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">代号 / 姓名</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="例如：Neo"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">当前可配置资金</label>
              <div className="relative">
                <Wallet className="absolute left-3 top-3 text-slate-500" size={18} />
                <input 
                  type="text" 
                  value={formData.currentCapital}
                  onChange={(e) => handleChange('currentCapital', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="$100,000"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">主要目标</label>
              <div className="relative">
                <Target className="absolute left-3 top-3 text-slate-500" size={18} />
                <input 
                  type="text" 
                  value={formData.primaryGoal}
                  onChange={(e) => handleChange('primaryGoal', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="定义你的目标..."
                />
              </div>
            </div>
            <button 
              onClick={nextStep}
              disabled={!formData.name}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一步
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-3">投资经验</label>
              <div className="grid grid-cols-3 gap-2">
                {['新手', '中级', '专家'].map(level => (
                  <button
                    key={level}
                    onClick={() => handleChange('experienceLevel', level)}
                    className={`p-2 rounded-lg border text-sm transition-all ${
                      formData.experienceLevel === level 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-3">风险承受能力</label>
              <div className="grid grid-cols-3 gap-2">
                {['保守', '稳健', '激进'].map(level => (
                  <button
                    key={level}
                    onClick={() => handleChange('riskTolerance', level)}
                    className={`p-2 rounded-lg border text-sm transition-all ${
                      formData.riskTolerance === level 
                        ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

             <button 
              onClick={() => onComplete(formData)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors mt-6"
            >
              进入作战室
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSetup;

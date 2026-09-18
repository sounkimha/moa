import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { colors as c } from '../theme/tokens';
import { Button, Notice, Row, Stack, Txt } from '../components/ui';
import { Logo } from '../components/visuals';

export function SignupScreen() {
  const a = useApp();
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const nicknameInput = useRef<TextInput>(null), passwordInput = useRef<TextInput>(null), confirmInput = useRef<TextInput>(null);
  const submit = async () => {
    if (a.busy) return;
    setSubmitted(false);
    if (!/^[A-Za-z0-9._-]{3,32}$/.test(username.trim())) { setError('아이디는 3~32자의 영문·숫자·점·밑줄·하이픈으로 입력해주세요.'); return; }
    if (nickname.trim().length < 2 || nickname.trim().length > 24) { setError('닉네임은 2~24자로 입력해주세요.'); return; }
    if (password.length < 8 || password.length > 128 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9\s]/.test(password)) { setError('비밀번호는 8자 이상이며 영문·숫자·특수문자를 포함해야 해요.'); return; }
    if (password !== confirmation) { setError('비밀번호가 일치하지 않아요. 다시 확인해주세요.'); return; }
    setError('');
    setSubmitted(true);
    if (await a.register(username.trim(), password, nickname.trim())) {
      a.tab('home');
      a.notify('회원가입을 완료했어요. 가는 김에, 하나 더!');
    }
  };
  const message = error || (submitted ? a.error : '');
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView testID="signup-scroll" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 28, paddingBottom: 40, gap: 24 }}>
      <Row style={{ justifyContent: 'space-between' }}><Pressable accessibilityRole="button" accessibilityLabel="회원가입 닫기" disabled={a.busy} onPress={() => a.back()} style={{ width: 44, height: 44, justifyContent: 'center' }}><ArrowLeft size={24} color={c.ink} /></Pressable><Logo size={32} /><View style={{ width: 44 }} /></Row>
      <Stack gap={8}><Txt size={28} weight="800">회원가입</Txt><Txt size={15} color={c.secondary}>한 계정으로 부탁하고, 가져올 수 있어요.</Txt></Stack>
      <Stack gap={18}>
        <Stack gap={8}><Txt size={14} weight="600">아이디</Txt><TextInput accessibilityLabel="회원가입 아이디" value={username} onChangeText={setUsername} editable={!a.busy} maxLength={32} autoCapitalize="none" autoCorrect={false} autoComplete="username-new" textContentType="username" returnKeyType="next" onSubmitEditing={() => nicknameInput.current?.focus()} placeholder="영문·숫자 등 3~32자" placeholderTextColor={c.muted} style={styles.input} /><Txt size={12} color={c.secondary}>영문 대소문자는 구분하지 않아요. 점·밑줄·하이픈도 가능해요.</Txt></Stack>
        <Stack gap={8}><Txt size={14} weight="600">닉네임</Txt><TextInput ref={nicknameInput} accessibilityLabel="닉네임" value={nickname} onChangeText={setNickname} editable={!a.busy} maxLength={24} autoCorrect={false} autoComplete="nickname" returnKeyType="next" onSubmitEditing={() => passwordInput.current?.focus()} placeholder="앱에서 사용할 이름 (2~24자)" placeholderTextColor={c.muted} style={styles.input} /></Stack>
        <Stack gap={8}><Txt size={14} weight="600">비밀번호</Txt><TextInput ref={passwordInput} accessibilityLabel="회원가입 비밀번호" value={password} onChangeText={setPassword} editable={!a.busy} maxLength={128} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" secureTextEntry returnKeyType="next" onSubmitEditing={() => confirmInput.current?.focus()} placeholder="8자 이상 · 영문·숫자·특수문자" placeholderTextColor={c.muted} style={styles.input} /></Stack>
        <Stack gap={8}><Txt size={14} weight="600">비밀번호 확인</Txt><TextInput ref={confirmInput} accessibilityLabel="비밀번호 확인" value={confirmation} onChangeText={setConfirmation} editable={!a.busy} maxLength={128} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" secureTextEntry returnKeyType="go" onSubmitEditing={() => void submit()} placeholder="비밀번호를 한 번 더 입력해주세요" placeholderTextColor={c.muted} style={styles.input} /></Stack>
        {!!message && <Notice tone="error">{message}</Notice>}
        <Button label="가입하고 시작하기" loading={a.busy} onPress={submit} />
      </Stack>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: 8 }}><Txt size={13} color={c.secondary}>이미 계정이 있나요?</Txt><Button label="로그인하기" small kind="ghost" disabled={a.busy} onPress={() => a.tab('login')} /></View>
      <Txt size={12} color={c.secondary} style={{ textAlign: 'center' }}>테스트 앱 계정이에요. 실제 결제나 정산은 발생하지 않아요.{ '\n' }자동 로그인·생체 인증은 다음 로그인 때 선택할 수 있어요.</Txt>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  input: { minHeight: 54, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.paper, color: c.ink, fontSize: 16 },
});

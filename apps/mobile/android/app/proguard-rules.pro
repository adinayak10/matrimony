# Referenced by app/build.gradle (release). Only applied when minifyEnabled is
# turned on, but kept ready so enabling R8 later does not break calls.

# Agora RTC engine (voice / video calls) uses JNI and reflection.
-keep class io.agora.** { *; }
-dontwarn io.agora.**

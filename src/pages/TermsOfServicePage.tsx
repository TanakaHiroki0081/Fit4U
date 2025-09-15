import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-default-bg py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              to="/auth"
              className="inline-flex items-center space-x-2 text-secondary hover:text-primary"
            >
              <ArrowLeft size={20} />
              <span>戻る</span>
            </Link>
            <div className="flex items-center space-x-2">
              <FileText className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold text-default-text">FIT4U利用規約</h1>
            </div>
          </div>
          <p className="text-secondary">最終更新日: 2025年1月13日</p>
        </div>

        {/* Terms Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="prose max-w-none">
            <h2 className="text-xl font-bold text-default-text mb-4">FIT4U共通利用規約（トレーナー・トレーニー共通）</h2>
            
            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第1条（適用）</h3>
            <p className="text-secondary mb-4">
              本規約は、Invicta合同会社（以下「当社」）が運営するグループフィットネスプラットフォーム「FIT4U」（以下「本サービス」）の利用に関し、当社とすべてのユーザー（トレーナーおよびトレーニー）との関係を定めるものです。<br />
              本サービスでは、グループレッスン（ヨガ、ピラティス、各種ダンス、HIIT、バレエ、筋トレ等、以下「トレーニング」）の提供・予約を対象とします。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第2条（定義）</h3>
            <p className="text-secondary mb-4">
              「トレーナー」とは、本サービスを通じてトレーニング（レッスン）を提供する者を指します。<br />
              「トレーニー」とは、本サービスを通じてトレーニングを予約・受講する者を指します。<br />
              「個別契約」とは、トレーナーとトレーニーの間で成立するトレーニング提供に関する契約です。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第3条（会員登録とアカウント）</h3>
            <p className="text-secondary mb-4">
              ユーザーは当社所定の方法で登録を行い、正確な情報を常に保持するものとします。<br />
              アカウントは1人1つに限られ、他者との共有・譲渡は禁止されます。<br />
              当社は不正行為の検知・対応のため、アカウントの一時停止や削除を行うことがあります。<br />
              一度停止・削除されたユーザーの再登録は禁止されます。<br />
              トレーナー登録については、当社が登録申請内容を審査し、承認した場合にのみ利用が可能となります。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第4条（禁止行為）</h3>
            <ul className="text-secondary mb-4 list-disc list-inside space-y-1">
              <li>他人への嫌がらせ・脅迫・虚偽情報の提供</li>
              <li>他人のアカウント使用、複数アカウント作成</li>
              <li>トレーニーにトレーニング会場での場所代や入場料等の追加費用を負担させる行為</li>
              <li>本サービス外での直接取引の誘引や不正な予約・キャンセル</li>
              <li>本サービスの運営を妨げる行為、または当社、他のトレーナー、トレーニーの名誉・信用を毀損する行為</li>
              <li>著作権侵害、わいせつ・差別的・違法なコンテンツの投稿</li>
              <li>法令、公序良俗に反する行為、またはそのおそれのある行為</li>
              <li>当社が提供する情報を無断で複製、改変、配布する行為</li>
              <li>スパム、不正アクセス、システムの妨害（ハッキング、過度なアクセス、ウイルス等）</li>
            </ul>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第5条（サービスの変更・停止・終了）</h3>
            <p className="text-secondary mb-4">
              当社は、サービス内容の変更・中止・機能削除等を、ユーザーへの通知なく実施できます。<br />
              当社は、アカウント、予約、支払いを予告なく一時停止・削除でき、理由の如何を問わず責任を負いません。<br />
              本サービスの中断・終了が発生した場合、ユーザーに対し通知は行いますが、それに伴う損害への補償責任は負いません。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第6条（個人情報の管理と共有）</h3>
            <p className="text-secondary mb-4">
              当社は、ユーザーの個人情報を適切に管理し、サービス運営・改善・マーケティング・提携トレーナーとの連携のために使用します。<br />
              予約時、トレーナーまたは施設には氏名・メールアドレス等が共有されることがあります。<br />
              トレーナーが取得した個人情報は、当該レッスン提供の目的に限り使用され、厳重に管理されなければなりません。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第7条（ユーザー投稿とレビュー）</h3>
            <p className="text-secondary mb-4">
              投稿されたレビューやコメントは、当社が任意で削除・公開・編集できるものとします。<br />
              ユーザーは、投稿に含まれるコンテンツに関して、FIT4Uおよびそのパートナーに対し、無償かつ取消不能の利用許諾を与えるものとします。<br />
              投稿内容に関する責任は投稿者が負い、誹謗中傷・違法・不正確な内容に関する損害に関し、当社は免責されます。<br />
              FIT4Uは違法な投稿者に対し、アカウントの停止・削除等の措置を行うことができます。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第8条（責任の制限と免責）</h3>
            <p className="text-secondary mb-4">
              本サービス利用により発生した損害に対し、当社は故意・重過失を除き、一切責任を負いません。<br />
              トレーナーとトレーニー間の契約・トラブルについては、当事者間で解決するものとし、当社は関与しません（トレーナーの遅刻等により、予め合意された日時にレッスンが提供されない場合等も含む）。<br />
              本サービスの中断、施設の質、安全性、健康リスク、通信環境に起因する問題等について、当社は責任を負いません。<br />
              本サービスのシステム障害や、不可抗力（電車遅延、自然災害等を含む）に伴う中断が発生した場合でも、当社は補償責任を負いません。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第9条（医療的免責）</h3>
            <p className="text-secondary mb-4">
              サイト上の情報やレッスン内容は医療的助言ではなく、健康上の判断が必要な場合は医師等に確認してください。<br />
              体調不良や疾患のある方は事前に医師の確認を行い、自己責任でご利用ください。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第10条（著作権・知的財産）</h3>
            <p className="text-secondary mb-4">
              本サービス上のコンテンツ（文章・画像・動画・音声・デザイン等）は、当社または第三者の知的財産として保護されており、無断利用はできません。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第11条（第三者との取引）</h3>
            <p className="text-secondary mb-4">
              当社は、本サービス内に掲載されたリンクや広告、トレーナーが提供する外部サービス等の第三者との取引について責任を負いません。<br />
              ユーザーと第三者間で生じた損害・紛争については、当事者間で解決するものとします。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第12条（規約の変更）</h3>
            <p className="text-secondary mb-4">
              当社は、本規約を随時変更できるものとし、変更後はウェブサイト上での掲示をもって効力を発生します。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第13条（準拠法・裁判管轄）</h3>
            <p className="text-secondary mb-4">
              本規約は日本法に準拠し、紛争は東京地方裁判所を第一審の専属的合意管轄裁判所とします。
            </p>

            <h2 className="text-xl font-bold text-default-text mt-8 mb-4">FIT4U トレーナー向け特則</h2>
            
            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第1条（トレーニングの登録と提供責任）</h3>
            <p className="text-secondary mb-4">
              トレーニングの内容・日時・料金・場所（具体的な会場住所を含む）は事前に正確に登録し、会場確保を完了した上で掲載すること。<br />
              既に1件でも成約している予約があるレッスンの日時・料金・場所を変更することはできません。変更したい場合は、一度、当該レッスンをキャンセルの上、正しい日時・料金・場所（具体的な会場住所を含め）を記載の上、レッスンを新たに登録し直す必要があります。<br />
              登録情報と実施内容が著しく異なる場合、当社は掲載取り下げ、返金処理、アカウント停止を行うことがあります。<br />
              トレーナーは、トレーニーとの間で成立した個別契約に基づくトレーニングの提供について全責任を負うものとし、当社は当該契約の履行に関して一切の責任を負いません。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第2条（キャンセルポリシー・遅刻）</h3>
            <p className="text-secondary mb-4">
              無断キャンセル・当日キャンセル・レッスンへの遅刻が複数回あった場合、当社はアカウント停止・資格停止処分を行うことがあります。<br />
              トレーナー都合によるキャンセルが発生した場合、トレーニーに全額返金され、報酬は発生しません。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第3条（報酬と手数料）</h3>
            <p className="text-secondary mb-4">
              トレーニーが支払った金額のうち20%を当社が手数料として差引き、残り80%はトレーナーがFIT4U上で振込申請を行った後、通常1週間〜10日以内を目安に、指定口座へ振り込みます（振込手数料はトレーナーの負担とします）。<br />
              売上金額は、月末締め、翌月10営業日目に振込申請可能となります。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第4条（直接取引・誘引の禁止）</h3>
            <p className="text-secondary mb-4">
              FIT4U経由で知り合ったトレーニーに対し、FIT4Uを介さずに予約や決済を行う行為は禁止とします。<br />
              本規約違反時には、アカウント停止、損害賠償請求、実費請求が行われる可能性があります。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第5条（クレーム対応と会員資格の停止）</h3>
            <p className="text-secondary mb-4">
              トレーニーからトレーナーに対するクレームが頻発した場合、当社はトレーナーの会員資格を停止する可能性があります。<br />
              前各条に定める禁止行為が確認された場合にも、当社はトレーナーの会員資格を停止できるものとします。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第6条（個別契約の責任）</h3>
            <p className="text-secondary mb-4">
              トレーナーは、トレーニーとの個別契約に基づくトレーニング提供に関して、履行責任を単独で負うものとします。当社は当該契約に関して一切の責任を負いません。
            </p>

            <h2 className="text-xl font-bold text-default-text mt-8 mb-4">FIT4U トレーニー向け特則</h2>
            
            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第1条（予約・支払い）</h3>
            <p className="text-secondary mb-4">
              トレーニーは本サービス上で予約を行い、指定の方法で事前に支払いを行うこととします。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第2条（キャンセルポリシー）</h3>
            <p className="text-secondary mb-4">
              レッスン前日の23時59分59秒までにキャンセルした場合、決済手数料控除後の金額が返金されます。<br />
              レッスン前日の23時59分59秒までにキャンセルしていない場合、または無断欠席の場合、いかなる理由があっても返金は行われません。<br />
              トレーナー都合で中止・キャンセルされた場合は、決済手数料控除後の金額が返金となります。<br />
              なお、返金処理には通常1週間から10日程度を要します。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第3条（禁止行為）</h3>
            <p className="text-secondary mb-4">
              トレーナーへの不当要求、誹謗中傷、嫌がらせ、脅迫的行為は禁止です。<br />
              規約違反が確認された場合、当社はアカウント停止などの措置を講じることがあります。
            </p>

            <h3 className="text-lg font-semibold text-default-text mt-6 mb-3">第4条（クレーム対応と会員資格の停止）</h3>
            <p className="text-secondary mb-4">
              トレーナーからトレー二ーに対するクレームが頻発した場合、当社はトレー二ーの会員資格を停止する可能性があります。<br />
              前各条に定める禁止行為が確認された場合にも、当社はトレー二ーの会員資格を停止できるものとします。
            </p>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">お問い合わせ窓口</h3>
              <p className="text-blue-700">
                <a href="mailto:fit4u@invictajp.com" className="underline hover:text-blue-900">
                  fit4u@invictajp.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
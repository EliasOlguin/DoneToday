using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

var output = Path.GetFullPath(Path.Combine(".local", "deployment", "data-protection-certificate.txt"));
if (File.Exists(output)) throw new InvalidOperationException("Certificate file already exists; preserve it for future redeploys.");
Directory.CreateDirectory(Path.GetDirectoryName(output)!);
using var rsa = RSA.Create(3072);
var request = new CertificateRequest("CN=DoneToday Data Protection", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
using var certificate = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddMinutes(-5), DateTimeOffset.UtcNow.AddYears(5));
File.WriteAllText(output, Convert.ToBase64String(certificate.Export(X509ContentType.Pfx)));
Console.WriteLine("Deployment certificate saved under .local/deployment (ignored by Git). Its contents were not printed.");

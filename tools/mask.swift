import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
let inURL = URL(fileURLWithPath: args[1]), outURL = URL(fileURLWithPath: args[2])
guard let src = CGImageSourceCreateWithURL(inURL as CFURL, nil),
      let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fatalError("load") }
let req = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try handler.perform([req])
guard let obs = req.results?.first else { fatalError("no subject") }
print("instances", obs.allInstances.count)
// the soft mask itself, scaled to the input, so edges can be refined later
let mask = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler)
let ci = CIImage(cvPixelBuffer: mask)
let ctx = CIContext()
let gray = CGColorSpace(name: CGColorSpace.linearGray)!
try ctx.writePNGRepresentation(of: ci, to: outURL, format: .L8, colorSpace: gray)
print("ok", ci.extent)
